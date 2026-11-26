'use strict';

const { withAlpha } = require('./kit/canvas');
const { t } = require('./kit/i18n');

const SCENARIO = 'previewWelcome';
const PREVIEW_STATE = 'previewNoticeState';
const RELEASE_STATE = 'appNoticeState';
const welcome = {
    id: 'welcome',
    title: 'Welcome to DPF Status',
    lines: [
        'The app monitors the diesel particulate filter (DPF) and its regeneration. It shows soot and ash levels, the distance since the last regeneration and other data.',
        'On supported vehicles with a B57 engine, you can enable regeneration alerts on the instrument cluster (KOMBI).',
    ],
};
const update0190 = {
    id: 'whats-new-0.1.90',
    version: '0.1.90',
    title: "What's New",
    bullets: true,
    footer: 'See About for full details.',
    lines: [
        'Automatic vehicle equipment check',
        'Background monitoring of DPF regeneration',
        'KOMBI alerts during regeneration on supported B57 vehicles',
    ],
};
const scenarios = {
    welcome: [welcome],
    dashboard: [],
    update: [update0190],
};
function wrapParagraph(cv, text, size, width, options) {
    const lines = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
        const next = line ? line + ' ' + word : word;
        if (line && cv.textWidth(next, size, options) > width) {
            lines.push(line);
            line = word;
        } else {
            line = next;
        }
    }
    lines.push(line);
    return lines;
}

function compareVersions(left, right) {
    const a = left.split(/[.+-]/);
    const b = right.split(/[.+-]/);
    for (let i = 0; i < 3; i++) {
        const difference = Number(a[i]) - Number(b[i]);
        if (difference) return difference;
    }
    return 0;
}

function start(settings, release) {
    let index = 0;
    const scenario = () => settings.get(SCENARIO);
    const stateKey = release ? RELEASE_STATE : PREVIEW_STATE;
    const releaseNotices = [update0190];
    if (release && !settings.get(stateKey)) {
        settings.set(stateKey, {
            // Legacy builds did not record a version in app data.
            sinceVersion: release.existing ? '0.1.82' : release.version,
            welcome: !release.existing,
            acknowledged: [],
        });
    }
    const state = () => {
        const saved = settings.get(stateKey);
        return release || (saved && saved.scenario === scenario())
            ? saved
            : { scenario: scenario(), acknowledged: [] };
    };
    const pending = () => {
        const profile = state();
        const notices = release
            ? (profile.welcome ? [welcome] : []).concat(releaseNotices.filter(notice =>
                compareVersions(notice.version, profile.sinceVersion) > 0 &&
                compareVersions(notice.version, release.version) <= 0))
            : scenarios[scenario()] || [];
        return notices.filter(notice => profile.acknowledged.indexOf(notice.id) < 0);
    };

    function next() {
        const queue = pending();
        if (!queue.length) return;
        if (index < queue.length - 1) {
            index++;
            return;
        }
        const profile = state();
        settings.set(stateKey, Object.assign({}, profile, {
            acknowledged: profile.acknowledged.concat(queue.map(notice => notice.id)),
        }));
        if (!release) settings.set(SCENARIO, 'dashboard');
        index = 0;
    }

    function previous() {
        index = Math.max(0, index - 1);
    }

    settings.onChange(key => {
        if (!release && key === SCENARIO) {
            index = 0;
            settings.set(stateKey, { scenario: scenario(), acknowledged: [] });
        }
    });

    function draw(cv, theme, repaint) {
        const queue = pending();
        if (!queue.length) return;
        const notice = queue[index];
        const highlight = theme.accent2 || theme.text;
        const text = { font: 'bold' };
        const center = { align: 'center', font: 'bold' };
        cv.fillRect(0, 0, cv.w, cv.h, withAlpha('#000000', 0.72));
        cv.roundRect(290, 84, 1020, 374, 18, theme.panelTop);
        cv.strokeRoundRect(290, 84, 1020, 374, 18, 2, theme.panelEdge);
        cv.text(notice.title, 338, 174, 42, theme.text, text);
        cv.fillRect(338, 194, 44, 4, highlight);
        const literal = { literal: true };
        const x = notice.bullets ? 359 : 338;
        const width = 1262 - x, lineHeight = 32, paragraphGap = 10;
        const bodyHeight = notice.footer ? 116 : 138;
        const paragraphs = notice.lines.map(t);
        let size = 29;
        const wrap = () => paragraphs.map(paragraph => wrapParagraph(cv, paragraph, size, width, literal));
        let rows = wrap();
        const fits = () => rows.reduce((count, paragraph) => count + paragraph.length, 0) * lineHeight + (rows.length - 1) * paragraphGap <= bodyHeight
            && rows.every(paragraph => paragraph.every(line => cv.textWidth(line, size, literal) <= width));
        while (size > 18 && !fits()) {
            size--;
            rows = wrap();
        }
        let y = 233;
        for (const paragraph of rows) {
            if (notice.bullets) cv.circle(342, y - size * 0.33, 3, theme.text);
            for (const line of paragraph) {
                cv.text(line, x, y, size, theme.text, literal);
                y += lineHeight;
            }
            y += paragraphGap;
        }
        if (notice.footer) cv.text(notice.footer, 338, 349, 21, theme.dim);
        cv.fillRect(338, notice.footer ? 365 : 354, 924, 1, theme.panelEdge);
        if (queue.length > 1) {
            cv.text((index + 1) + ' / ' + queue.length, 800, 412, 25, theme.dim, center);
            if (index > 0) button(338, 'Previous page', previous, false, 'notice-previous');
        }
        button(1032, index < queue.length - 1 ? 'Next page' : 'OK', next, true, 'notice-next');

        function button(x, label, run, primary, key) {
            const y = 376, width = 230, height = 56;
            cv.roundRect(x, y, width, height, 9, primary ? highlight : theme.track);
            cv.text(label, x + width / 2, y + 36, 24, primary ? theme.bg : theme.text, center);
            cv.target(x, y, width, height, () => {
                run();
                return repaint();
            }, key, 9, theme.text);
        }
    }

    return { active: () => pending().length > 0, next, previous, draw };
}

module.exports = { start };
