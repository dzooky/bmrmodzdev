'use strict';

const mgu = require('./kit/mgu');
const G = require('./kit/gauges');
const Car = require('./kit/car');
const { ReadOnlyDiag } = require('./kit/readonly-diag');
const CarEquipment = require('./kit/car-equipment');
const { CODES: EQUIPMENT_CODES, fromResults: equipmentFromResults } = require('./equipment');
const managedTemperature = require('./managed-temperature');
const { renderAbout, maxScroll: maxAboutScroll } = require('./about');
const renderSeats = require('./seats');
const createIhkaTest = require('./ihka-test');
const createWheelTest = require('./wheel-test');
const renderSteering = require('./steering');
const createSettingsPage = require('./settings');
const selectTemperature = require('./temperature-source');
const createAutomation = require('./automation');
const getActivationState = require('./activation-state');
const applyTestThresholds = require('./test-thresholds');
const createDiagnosticQueue = require('./diagnostic-queue');
const bmwServices = require('./bmw-services');

const NOTICE = [
    'This application is still in development phase and not ready for public use.',
    'We still working on it and will be available soon.',
    'Thank you',
];

function equipmentTabs(equipment) {
    const tabs = ['Info'];
    if (equipment.frontSeatHeating === true || equipment.frontSeatVentilation === true) tabs.push('Front');
    if (equipment.rearSeatHeating === true || equipment.rearSeatVentilation === true) tabs.push('Rear');
    if (equipment.steeringWheelHeating === true) tabs.push('Steering');
    tabs.push('My Car', 'Settings', 'About');
    return tabs;
}

function drawUnconfirmed(cv, x, y) {
    const color = '#ff5555';
    cv.arc(x, y, 9, 12, 0, 360, color);
    cv.polyline([[x - 7, y - 7], [x + 7, y + 7]], 3, color);
}

function renderEquipment(cv, theme, equipment, rows, voStatus) {
    const center = { align: 'center' };
    cv.text('Equipment', 66, 96, 19, theme.dim);
    cv.text('Installed', 1450, 96, 19, theme.dim, center);
    if (voStatus) cv.text(voStatus, 800, 70, 17, theme.dim, center);
    rows.forEach(({ key, label }, index) => {
        const y = 140 + index * 44;
        cv.fillRect(55, y - 25, 1490, 1, theme.dim);
        cv.text(label, 66, y + 13, 24, theme.text);
        if (equipment[key] === true) {
            cv.polyline([[1438, y - 1], [1446, y + 7], [1462, y - 9]], 4, '#55d884');
        } else if (equipment[key] === false) {
            cv.text('-', 1450, y + 13, 19, theme.dim, center);
        } else {
            drawUnconfirmed(cv, 1450, y);
        }
    });

}

mgu.run({
    start(ctx) {
        ctx.hideButton('BTN_SETTINGS');
        applyTestThresholds(ctx.settings, ctx.spec.config.garageThresholdTest === true);
        const settingsPage = createSettingsPage(ctx.settings);
        const rows = ctx.spec.config.previewEquipment;
        const link = ctx.isPreview ? null : new ReadOnlyDiag(ctx.signals, ctx.log);
        let equipment = {};
        const enqueueDiagnostic = createDiagnosticQueue();
        const wheelTest = createWheelTest(ctx, enqueueDiagnostic);
        const temperatures = managedTemperature.create();
        const seatTemperatures = {};
        const temperatureSnapshot = () => temperatures.data();
        let footwellAvailable = false;
        const temperatureFor = position => {
            return selectTemperature(ctx.settings, equipment, temperatureSnapshot(), position);
        };
        const car = link ? new Car(ctx, ['rpm']) : null;
        const allowEngineOffTest = ctx.spec.config.allowEngineOffTest === true;
        const activationState = () => ctx.settings.get('appEnabled') !== true ? false : car
            ? getActivationState(car.data(), allowEngineOffTest, car.lastCar, Date.now(),
                temperatures.hasValidFootwell()) : null;
        const activationReady = () => activationState() === true;
        const ihkaTest = createIhkaTest(ctx, activationReady, enqueueDiagnostic);
        const automation = createAutomation(ctx.settings, temperatureFor, activationState, ihkaTest, wheelTest, ctx.log);
        ctx.settings.onChange(key => {
            if (key !== 'appEnabled') return;
            automation.stop();
            ihkaTest.resetBeltChecks();
            if (ctx.settings.get('appEnabled') === true && link) link.wake(0x78);
        });
        let tabs = [];
        let page = 'Info';
        let servicesReport = null;
        let servicesScroll = 0;
        let servicesSelection = null;
        let aboutScroll = 0;
        let voStatus = ctx.isPreview ? 'Preview equipment' : 'Checking Car Equipment...';
        let equipmentChecking = false;
        let nextEquipmentRead = 0;

        async function detectEquipment(force = false) {
            if (ctx.isPreview || equipmentChecking || (!force && Date.now() < nextEquipmentRead)) return;
            equipmentChecking = true;
            voStatus = 'Reading Car Equipment...';
            try {
                // Explicit rescan uses the tool's refresh API instead of its VO cache.
                if (force) {
                    const refreshed = await CarEquipment.request({ op: 'refresh' }, { timeout: 15000 });
                    if (!refreshed || refreshed.ok !== true || refreshed.fresh !== true) {
                        throw new Error(refreshed && refreshed.error || 'Vehicle order unavailable');
                    }
                }
                const result = await CarEquipment.check(EQUIPMENT_CODES, { timeout: 15000 });
                equipment = equipmentFromResults(result.results);
                const confirmed = EQUIPMENT_CODES.every(code => result.results &&
                    (result.results[code] === true || result.results[code] === false));
                if (result.ok && confirmed) {
                    voStatus = 'Car Equipment: vehicle order detected';
                } else {
                    voStatus = 'Car Equipment: vehicle order unavailable';
                    ctx.log.warn('Climate Comfort Car Equipment: ' + (result.error || 'Unknown equipment'));
                }
            } catch (error) {
                equipment = {};
                voStatus = 'Car Equipment: vehicle order unavailable';
                ctx.log.warn('Climate Comfort Car Equipment: ' + String(error.message || error));
            } finally {
                equipmentChecking = false;
                nextEquipmentRead = Date.now() + (voStatus.includes('detected') ? 60000 : 30000);
            }
        }

        function reloadEquipment() {
            if (ctx.isPreview || equipmentChecking) return;
            return detectEquipment(true);
        }

        function scanBmwServices() {
            servicesReport = bmwServices.scan();
            servicesScroll = 0;
            servicesSelection = null;
            page = 'BMW services';
        }

        ctx.onScroll(delta => {
            if (page === 'BMW services' && servicesReport) {
                const next = Math.max(0, Math.min(bmwServices.maxScroll(servicesReport, servicesSelection), servicesScroll + delta));
                if (next === servicesScroll) return false;
                servicesScroll = next;
                return true;
            }
            if (page !== 'About') return false;
            const next = Math.max(0, Math.min(maxAboutScroll, aboutScroll + delta));
            if (next === aboutScroll) return false;
            aboutScroll = next;
            return true;
        });

        ctx.onTab(index => {
            if (tabs[index] && page !== tabs[index]) {
                settingsPage.close();
                page = tabs[index];
                if (link && (page === 'Front' || page === 'Rear')) link.wake(0x78);
            }
        });

        ctx.ui.onVisible((name, visible) => {
            if (name === 'MAIN') {
                temperatures.setVisible(visible);
                if (!visible) automation.stop();
            }
        });
        temperatures.setVisible(ctx.ui.isVisible('MAIN'));
        const temperatureTimer = setInterval(() => temperatures.poll(), 250);
        if (temperatureTimer.unref) temperatureTimer.unref();
        temperatures.poll();

        ctx.loop('MAIN', 4, () => {
            wheelTest.tick();
            detectEquipment().catch(error => ctx.log.warn('Climate Comfort Car Equipment poll: ' + error));
            // The managed temperature client polls independently of UI rendering.
            if (ctx.isPreview) {
                rows.forEach(({ key }) => { equipment[key] = ctx.settings.get(key) === true; });
            }
            if (link) automation.tick(equipment);
            tabs = equipmentTabs(equipment);
            if (!tabs.includes(page) && page !== 'BMW services') page = 'My Car';
            const theme = ctx.theme();
            const cv = ctx.canvas(1600, 520).clear(theme.bg);
            G.panel(cv, theme, 24, 44, 1552, 468, null);

            const gpu = ctx.display && ctx.display.gpu;
            if (page === 'Info') {
                NOTICE.forEach((line, index) => {
                    cv.text(line, 800, 218 + index * 42, 30, theme.text, { align: 'center' });
                });
            } else if (page === 'Front' || page === 'Rear') {
                renderSeats(cv, theme, ctx.settings, equipment, page, gpu, temperatureFor);
            } else if (page === 'Steering') {
                renderSteering(cv, theme, ctx.settings, equipment.mSportSteeringWheel === true, gpu, temperatureFor);
            } else if (page === 'BMW services') {
                bmwServices.render(cv, theme, servicesReport, servicesScroll, servicesSelection, index => {
                    servicesSelection = index;
                    servicesScroll = 0;
                });
                for (const [x, label, run, key] of [
                    [1225, servicesSelection === null ? 'Back' : 'List', () => {
                        if (servicesSelection === null) page = 'My Car';
                        else { servicesSelection = null; servicesScroll = 0; }
                    }, 'bmw-services-back'],
                    [1375, 'Rescan', scanBmwServices, 'bmw-services-rescan'],
                ]) {
                    cv.roundRect(x, 471, 125, 40, 10, '#ffffff19');
                    cv.text(label, x + 62, 497, 19, theme.text, { align: 'center' });
                    cv.target(x, 471, 125, 40, run, key, 10);
                }
            } else if (page === 'My Car') {
                renderEquipment(cv, theme, equipment, rows, voStatus);
                cv.roundRect(940, 471, 280, 40, 10, '#ffffff19');
                cv.text('BMW services test', 1080, 497, 19, theme.text, { align: 'center' });
                cv.target(940, 471, 280, 40, scanBmwServices, 'bmw-services-test', 10);
                if (link) {
                    const busy = equipmentChecking;
                    cv.roundRect(1245, 471, 245, 40, 10, '#ffffff19');
                    cv.text('Reload equipment', 1367, 497, 19, busy ? theme.dim : theme.text, { align: 'center' });
                    if (!busy) cv.target(1245, 471, 245, 40, reloadEquipment, 'reload-equipment');
                }
            } else if (page === 'Settings') {
                settingsPage.render(cv, theme, equipment);
            } else if (page === 'About') {
                renderAbout(cv, theme, aboutScroll);
            }

            G.frame(cv, theme, tabs, tabs.indexOf(page === 'BMW services' ? 'My Car' : page), []);
            return ctx.ui.image('MAIN_GFX', cv);
        });
    },
});
