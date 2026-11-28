'use strict';

const { withAlpha } = require('./kit/canvas');

const SCENARIO = 'previewNoticeScenario';
const LANGUAGE = 'previewWelcome';
const messages = {
    'welcome-sk': {
        title: "Vitajte v Climate Comfort",
        paragraphs: [
            "Aplikácia umožňuje automatické spustenie vyhrievania a ventilácie sedadiel aj vyhrievania volantu podľa výbavy vozidla.",
            "Pre všetky podporované sedadlá si môžete zvoliť teplotné hranice a úrovne vyhrievania alebo ventilácie.",
        ],
        ok: 'OK',
    },
    'welcome-en': {
        title: "Welcome to Climate Comfort",
        paragraphs: [
            "The app can automatically activate seat heating, seat ventilation and steering wheel heating depending on your vehicle’s equipment.",
            "For all supported seats, you can choose temperature thresholds and heating or ventilation levels.",
        ],
        ok: 'OK',
    },
    'welcome-de': {
        title: "Willkommen bei Climate Comfort",
        paragraphs: [
            "Die App kann je nach Fahrzeugausstattung die Sitzheizung, die Sitzbelüftung und die Lenkradheizung automatisch einschalten.",
            "Für alle unterstützten Sitze können Sie Temperaturschwellen und Stufen für Heizung oder Belüftung festlegen.",
        ],
        ok: 'OK',
    },
    'welcome-es': {
        title: "Te damos la bienvenida a Climate Comfort",
        paragraphs: [
            "La aplicación puede activar automáticamente la calefacción y la ventilación de los asientos y la calefacción del volante, según el equipamiento del vehículo.",
            "Para todos los asientos compatibles puedes elegir los umbrales de temperatura y los niveles de calefacción o ventilación.",
        ],
        ok: 'Aceptar',
    },
    'welcome-fr': {
        title: "Bienvenue dans Climate Comfort",
        paragraphs: [
            "L’application peut activer automatiquement le chauffage et la ventilation des sièges ainsi que le chauffage du volant, selon l’équipement du véhicule.",
            "Pour tous les sièges compatibles, vous pouvez choisir les seuils de température et les niveaux de chauffage ou de ventilation.",
        ],
        ok: 'OK',
    },
    'welcome-hu': {
        title: "Üdvözöljük a Climate Comfort alkalmazásban",
        paragraphs: [
            "Az alkalmazás a jármű felszereltségétől függően automatikusan bekapcsolhatja az ülésfűtést, az ülésszellőztetést és a kormányfűtést.",
            "Minden támogatott üléshez beállíthatja a hőmérsékleti küszöbértékeket és a fűtés vagy szellőztetés fokozatát.",
        ],
        ok: 'Rendben',
    },
    'welcome-pl': {
        title: "Witamy w Climate Comfort",
        paragraphs: [
            "Aplikacja może automatycznie włączać ogrzewanie i wentylację siedzeń oraz ogrzewanie kierownicy, zależnie od wyposażenia pojazdu.",
            "Dla wszystkich obsługiwanych siedzeń możesz ustawić progi temperatury i poziomy ogrzewania lub wentylacji.",
        ],
        ok: 'OK',
    },
    'welcome-cs': {
        title: "Vítejte v Climate Comfort",
        paragraphs: [
            "Aplikace umožňuje automatické zapnutí vyhřívání a ventilace sedadel i vyhřívání volantu podle výbavy vozidla.",
            "Pro všechna podporovaná sedadla si můžete nastavit teplotní hranice a úrovně vyhřívání nebo ventilace.",
        ],
        ok: 'OK',
    },
    'welcome-it': {
        title: "Benvenuto in Climate Comfort",
        paragraphs: [
            "L’app può attivare automaticamente il riscaldamento e la ventilazione dei sedili e il riscaldamento del volante in base all’equipaggiamento del veicolo.",
            "Per tutti i sedili supportati puoi scegliere le soglie di temperatura e i livelli di riscaldamento o ventilazione.",
        ],
        ok: 'OK',
    },
    'welcome-ru': {
        title: "Добро пожаловать в Climate Comfort",
        paragraphs: [
            "Приложение может автоматически включать подогрев и вентиляцию сидений, а также подогрев руля в зависимости от комплектации автомобиля.",
            "Для всех поддерживаемых сидений можно выбрать температурные пороги и уровни подогрева или вентиляции.",
        ],
        ok: 'ОК',
    },
    'welcome-da': {
        title: "Velkommen til Climate Comfort",
        paragraphs: [
            "Appen kan automatisk aktivere sædevarme, sædeventilation og ratvarme afhængigt af bilens udstyr.",
            "For alle understøttede sæder kan du vælge temperaturgrænser og niveauer for varme eller ventilation.",
        ],
        ok: 'OK',
    },
    'welcome-el': {
        title: "Καλώς ήρθατε στο Climate Comfort",
        paragraphs: [
            "Η εφαρμογή μπορεί να ενεργοποιεί αυτόματα τη θέρμανση και τον αερισμό των καθισμάτων και τη θέρμανση του τιμονιού, ανάλογα με τον εξοπλισμό του οχήματος.",
            "Για όλα τα υποστηριζόμενα καθίσματα μπορείτε να επιλέξετε όρια θερμοκρασίας και επίπεδα θέρμανσης ή αερισμού.",
        ],
        ok: 'Εντάξει',
    },
    'welcome-zh-CN': {
        title: "欢迎使用 Climate Comfort",
        paragraphs: [
            "应用可根据车辆配置自动开启座椅加热、座椅通风和方向盘加热。",
            "您可以为所有支持的座椅设置温度阈值以及加热或通风档位。",
        ],
        ok: '确定',
    },
    'welcome-nl': {
        title: "Welkom bij Climate Comfort",
        paragraphs: [
            "De app kan afhankelijk van de voertuiguitrusting de stoelverwarming, stoelventilatie en stuurverwarming automatisch inschakelen.",
            "Voor alle ondersteunde stoelen kun je temperatuurdrempels en standen voor verwarming of ventilatie kiezen.",
        ],
        ok: 'OK',
    },
    'welcome-nb': {
        title: "Velkommen til Climate Comfort",
        paragraphs: [
            "Appen kan slå på setevarme, seteventilasjon og rattvarme automatisk, avhengig av bilens utstyr.",
            "For alle støttede seter kan du velge temperaturgrenser og nivåer for oppvarming eller ventilasjon.",
        ],
        ok: 'OK',
    },
    'welcome-pt': {
        title: "Boas-vindas ao Climate Comfort",
        paragraphs: [
            "A aplicação pode ativar automaticamente o aquecimento e a ventilação dos bancos e o aquecimento do volante, consoante o equipamento do veículo.",
            "Para todos os bancos compatíveis, pode escolher os limites de temperatura e os níveis de aquecimento ou ventilação.",
        ],
        ok: 'OK',
    },
    'welcome-ro': {
        title: "Bun venit în Climate Comfort",
        paragraphs: [
            "Aplicația poate activa automat încălzirea și ventilarea scaunelor și încălzirea volanului, în funcție de echiparea vehiculului.",
            "Pentru toate scaunele compatibile poți alege pragurile de temperatură și nivelurile de încălzire sau ventilare.",
        ],
        ok: 'OK',
    },
    'welcome-sl': {
        title: "Dobrodošli v Climate Comfort",
        paragraphs: [
            "Aplikacija lahko glede na opremo vozila samodejno vklopi ogrevanje in prezračevanje sedežev ter ogrevanje volana.",
            "Za vse podprte sedeže lahko izberete temperaturne pragove in stopnje ogrevanja ali prezračevanja.",
        ],
        ok: 'V redu',
    },
    'welcome-fi': {
        title: "Tervetuloa Climate Comfort -sovellukseen",
        paragraphs: [
            "Sovellus voi kytkeä istuinlämmityksen, istuintuuletuksen ja ohjauspyörän lämmityksen automaattisesti ajoneuvon varustelun mukaan.",
            "Voit valita kaikille tuetuille istuimille lämpötilarajat sekä lämmityksen tai tuuletuksen tehotasot.",
        ],
        ok: 'OK',
    },
    'welcome-sv': {
        title: "Välkommen till Climate Comfort",
        paragraphs: [
            "Appen kan automatiskt slå på sätesvärme, sätesventilation och rattvärme beroende på bilens utrustning.",
            "För alla säten som stöds kan du välja temperaturgränser och nivåer för värme eller ventilation.",
        ],
        ok: 'OK',
    },
    'welcome-tr': {
        title: "Climate Comfort’a hoş geldiniz",
        paragraphs: [
            "Uygulama, aracın donanımına bağlı olarak koltuk ısıtmasını, koltuk havalandırmasını ve direksiyon ısıtmasını otomatik olarak açabilir.",
            "Desteklenen tüm koltuklar için sıcaklık eşiklerini ve ısıtma veya havalandırma seviyelerini seçebilirsiniz.",
        ],
        ok: 'Tamam',
    },
    'welcome-uk': {
        title: "Вітаємо в Climate Comfort",
        paragraphs: [
            "Застосунок може автоматично вмикати підігрів і вентиляцію сидінь та підігрів керма залежно від комплектації автомобіля.",
            "Для всіх підтримуваних сидінь можна вибрати температурні пороги та рівні підігріву або вентиляції.",
        ],
        ok: 'Гаразд',
    },
};

const updates = {
    "welcome-sk": {
        "title": "Čo je nové",
        "paragraphs": [
            "Automatická kontrola výbavy vozidla a následné zobrazenie príslušných kariet",
            "Zobrazenie vonkajšej teploty alebo teplôt v priestore nôh cez Data Tool",
            "Opravené zobrazenie grafiky sedadiel a volantu"
        ],
        "footer": "Kompletné informácie nájdete v sekcii O aplikácii."
    },
    "welcome-en": {
        "title": "What's New",
        "paragraphs": [
            "Automatic vehicle equipment check and display of the relevant tabs",
            "Display of outside or footwell temperatures via Data Tool",
            "Fixed the display of seat and steering wheel graphics"
        ],
        "footer": "See About for full details."
    },
    "welcome-de": {
        "title": "Neuerungen",
        "paragraphs": [
            "Automatische Prüfung der Fahrzeugausstattung und Anzeige der passenden Registerkarten",
            "Anzeige der Außen- oder Fußraumtemperaturen über Data Tool",
            "Darstellung der Sitz- und Lenkradgrafiken korrigiert"
        ],
        "footer": "Alle Informationen finden Sie unter Über die App."
    },
    "welcome-es": {
        "title": "Qué hay de nuevo",
        "paragraphs": [
            "Comprobación automática del equipamiento y visualización de las pestañas correspondientes",
            "Visualización de la temperatura exterior o de la zona de los pies mediante Data Tool",
            "Corregida la visualización de los gráficos de los asientos y del volante"
        ],
        "footer": "Encontrarás toda la información en Acerca de la app."
    },
    "welcome-fr": {
        "title": "Quoi de neuf",
        "paragraphs": [
            "Vérification automatique de l’équipement du véhicule et affichage des onglets correspondants",
            "Affichage de la température extérieure ou des températures aux pieds via Data Tool",
            "Correction de l’affichage des images des sièges et du volant"
        ],
        "footer": "Retrouvez toutes les informations dans la section À propos."
    },
    "welcome-hu": {
        "title": "Újdonságok",
        "paragraphs": [
            "A jármű felszereltségének automatikus ellenőrzése és a megfelelő lapok megjelenítése",
            "A külső vagy a lábtér-hőmérsékletek megjelenítése a Data Tool segítségével",
            "Az ülés- és kormánygrafika megjelenítésének javítása"
        ],
        "footer": "A teljes tájékoztatás a Névjegy résznél található."
    },
    "welcome-pl": {
        "title": "Co nowego",
        "paragraphs": [
            "Automatyczna weryfikacja wyposażenia pojazdu i wyświetlanie odpowiednich kart",
            "Wyświetlanie temperatury zewnętrznej lub temperatur w przestrzeni na nogi przez Data Tool",
            "Poprawiono wyświetlanie grafiki siedzeń i kierownicy"
        ],
        "footer": "Pełne informacje znajdziesz w sekcji O aplikacji."
    },
    "welcome-cs": {
        "title": "Co je nového",
        "paragraphs": [
            "Automatická kontrola výbavy vozidla a zobrazení příslušných karet",
            "Zobrazení venkovní teploty nebo teplot v prostoru pro nohy přes Data Tool",
            "Opravené zobrazení grafiky sedadel a volantu"
        ],
        "footer": "Úplné informace najdete v části O aplikaci."
    },
    "welcome-it": {
        "title": "Cosa c'è di nuovo",
        "paragraphs": [
            "Controllo automatico dell’equipaggiamento e visualizzazione delle schede pertinenti",
            "Visualizzazione della temperatura esterna o del vano piedi tramite Data Tool",
            "Corretta la visualizzazione della grafica dei sedili e del volante"
        ],
        "footer": "Tutte le informazioni sono disponibili nella sezione Informazioni."
    },
    "welcome-ru": {
        "title": "Что нового",
        "paragraphs": [
            "Автоматическая проверка комплектации автомобиля и отображение соответствующих вкладок",
            "Отображение наружной температуры или температуры в зоне ног через Data Tool",
            "Исправлено отображение изображений сидений и руля"
        ],
        "footer": "Подробная информация доступна в разделе О приложении."
    },
    "welcome-da": {
        "title": "Hvad er nyt",
        "paragraphs": [
            "Automatisk kontrol af bilens udstyr og visning af de relevante faner",
            "Visning af udetemperaturen eller temperaturerne i fodrummet via Data Tool",
            "Rettet visning af sæde- og ratgrafik"
        ],
        "footer": "Se alle oplysninger under Om."
    },
    "welcome-el": {
        "title": "Τι νέο υπάρχει",
        "paragraphs": [
            "Αυτόματος έλεγχος εξοπλισμού οχήματος και εμφάνιση των αντίστοιχων καρτελών",
            "Εμφάνιση εξωτερικής θερμοκρασίας ή θερμοκρασιών στον χώρο των ποδιών μέσω Data Tool",
            "Διορθώθηκε η εμφάνιση των γραφικών καθισμάτων και τιμονιού"
        ],
        "footer": "Θα βρείτε όλες τις πληροφορίες στην ενότητα Σχετικά."
    },
    "welcome-zh-CN": {
        "title": "更新内容",
        "paragraphs": [
            "自动检查车辆配置并显示相应选项卡",
            "通过 Data Tool 显示车外温度或脚部空间温度",
            "修复座椅和方向盘图形显示"
        ],
        "footer": "完整信息请参阅关于应用。"
    },
    "welcome-nl": {
        "title": "Wat is er nieuw",
        "paragraphs": [
            "Automatische controle van de voertuiguitrusting en weergave van de bijbehorende tabbladen",
            "Weergave van de buitentemperatuur of de temperaturen in de voetenruimte via Data Tool",
            "Weergave van stoel- en stuurafbeeldingen gecorrigeerd"
        ],
        "footer": "Alle informatie staat in het gedeelte Over de app."
    },
    "welcome-nb": {
        "title": "Hva er nytt",
        "paragraphs": [
            "Automatisk kontroll av bilens utstyr og visning av de relevante fanene",
            "Visning av utetemperaturen eller temperaturene i fotbrønnen via Data Tool",
            "Rettet visning av sete- og rattgrafikk"
        ],
        "footer": "Du finner all informasjon under Om."
    },
    "welcome-pt": {
        "title": "O que há de novo",
        "paragraphs": [
            "Verificação automática do equipamento do veículo e apresentação dos separadores correspondentes",
            "Apresentação da temperatura exterior ou na zona dos pés através do Data Tool",
            "Corrigida a apresentação das imagens dos bancos e do volante"
        ],
        "footer": "Consulte a secção Sobre para obter todas as informações."
    },
    "welcome-ro": {
        "title": "Ce este nou",
        "paragraphs": [
            "Verificarea automată a echipării vehiculului și afișarea filelor corespunzătoare",
            "Afișarea temperaturii exterioare sau a temperaturilor din zona picioarelor prin Data Tool",
            "Afișarea imaginilor scaunelor și volanului a fost corectată"
        ],
        "footer": "Toate informațiile se găsesc în secțiunea Despre."
    },
    "welcome-sl": {
        "title": "Kaj je novega",
        "paragraphs": [
            "Samodejno preverjanje opreme vozila in prikaz ustreznih zavihkov",
            "Prikaz zunanje temperature ali temperatur v prostoru za noge prek Data Tool",
            "Popravljen prikaz grafike sedežev in volana"
        ],
        "footer": "Vse informacije najdete v razdelku O aplikaciji."
    },
    "welcome-fi": {
        "title": "Mitä uutta",
        "paragraphs": [
            "Ajoneuvon varusteiden automaattinen tarkistus ja vastaavien välilehtien näyttö",
            "Ulkolämpötilan tai jalkatilojen lämpötilojen näyttö Data Toolin kautta",
            "Istuinten ja ohjauspyörän kuvien näyttö korjattu"
        ],
        "footer": "Kaikki tiedot löytyvät Tietoja-osiosta."
    },
    "welcome-sv": {
        "title": "Vad är nytt",
        "paragraphs": [
            "Automatisk kontroll av bilens utrustning och visning av relevanta flikar",
            "Visning av utetemperaturen eller temperaturerna i fotutrymmena via Data Tool",
            "Rättad visning av grafiken för säten och ratt"
        ],
        "footer": "All information finns i avsnittet Om."
    },
    "welcome-tr": {
        "title": "Ne var ne yok",
        "paragraphs": [
            "Araç donanımının otomatik kontrolü ve ilgili sekmelerin gösterilmesi",
            "Dış ortam veya ayak bölgesi sıcaklıklarının Data Tool üzerinden gösterilmesi",
            "Koltuk ve direksiyon görsellerinin gösterimi düzeltildi"
        ],
        "footer": "Tüm bilgileri Hakkında bölümünde bulabilirsiniz."
    },
    "welcome-uk": {
        "title": "Що нового",
        "paragraphs": [
            "Автоматична перевірка комплектації автомобіля та показ відповідних вкладок",
            "Показ зовнішньої температури або температур у зоні ніг через Data Tool",
            "Виправлено відображення зображень сидінь і керма"
        ],
        "footer": "Повну інформацію наведено в розділі Про застосунок."
    }
};

function wrapParagraph(cv, paragraph, size, width, options) {
    const lines = [];
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
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

function start(settings, showInfo) {
    const current = () => {
        const scenario = settings.get(SCENARIO);
        const selected = settings.get(LANGUAGE);
        const language = Object.prototype.hasOwnProperty.call(messages, selected) ? selected : 'welcome-sk';
        if (scenario === 'welcome') return messages[language];
        if (scenario === 'update') return Object.assign({ ok: messages[language].ok }, updates[language]);
        return null;
    };
    const active = () => !!current();
    settings.onChange(key => {
        if ((key === SCENARIO || key === LANGUAGE) && active()) showInfo();
    });

    function draw(cv, theme) {
        const message = current();
        if (!message) return;
        const highlight = theme.accent2 || theme.text;
        const literal = { literal: true };
        const x = message.footer ? 359 : 338;
        const width = 1262 - x;
        const maxLines = message.footer ? 3 : 4;
        let size = 29;
        const layout = () => message.paragraphs.map(text => wrapParagraph(cv, text, size, width, literal));
        let paragraphs = layout();
        const fits = () => paragraphs.reduce((count, lines) => count + lines.length, 0) <= maxLines
            && paragraphs.every(lines => lines.every(line => cv.textWidth(line, size, literal) <= width));
        while (size > 18 && !fits()) {
            size--;
            paragraphs = layout();
        }

        cv.fillRect(0, 0, cv.w, cv.h, withAlpha('#000000', 0.72));
        cv.roundRect(290, 84, 1020, 374, 18, theme.panelTop);
        cv.strokeRoundRect(290, 84, 1020, 374, 18, 2, theme.panelEdge);
        cv.text(message.title, 338, 174, 42, theme.text, { font: 'bold', literal: true });
        cv.fillRect(338, 194, 44, 4, highlight);
        let y = 233;
        for (const lines of paragraphs) {
            if (message.footer) cv.circle(342, y - size * 0.33, 3, theme.text);
            for (const line of lines) {
                cv.text(line, x, y, size, theme.text, literal);
                y += 32;
            }
            y += 10;
        }
        if (message.footer) cv.text(message.footer, 338, 349, 21, theme.dim, literal);
        cv.fillRect(338, message.footer ? 365 : 354, 924, 1, theme.panelEdge);
        cv.roundRect(1032, 376, 230, 56, 9, highlight);
        cv.text(message.ok, 1147, 412, 24, theme.bg, { align: 'center', font: 'bold', literal: true });
        cv.target(1032, 376, 230, 56, () => settings.set(SCENARIO, 'dashboard'), 'welcome-accept', 9, theme.text);
    }

    return { active, draw };
}

module.exports = { start };
