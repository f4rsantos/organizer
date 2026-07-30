export const cs = {
  title: 'Návody',
  subtitle: 'Jak funguje každá část organizátoru a k čemu je dobrá.',
  close: 'Zavřít návody',
  sections: {
    core: 'Základ',
    productivity: 'Produktivita',
    sync: 'Synchronizace kalendáře',
    ambient: 'Na pozadí',
    sharing: 'Synchronizace a sdílení',
    setup: 'Nastavení',
  },
  entries: {
    tasks: {
      title: 'Úkoly',
      summary: 'Vše, co má termín tento týden, seřazené podle předmětu.',
      body: [
        'Úkoly zobrazují vždy jeden týden, seskupený podle předmětu, ke kterému úkol patří. Každé záhlaví předmětu nese kroužek ukazující, jak daleko jste, a vyprázdnění celého týdne spustí konfety. Šipky nahoře přepínají mezi týdny a záhlaví uvádí i případný svátek spadající do daného týdne.',
        'Stiskněte kulaté tlačítko + pro otevření formuláře. Nahoře vyplňte Předmět a Prioritu, poté název. Můžete psát i přirozeně: napište "esej z matematiky zítra" a po opuštění pole se vám sám doplní předmět i termín. Doplní jen ta pole, která jste si nenastavili sami.',
        'Dvě datová pole plní odlišné úkoly. Termín umístí úkol do kalendáře a spouští upozornění na dnešní termín. Od týdne a Do týdne určují, ve kterých týdnech seznamu Úkolů se úkol zobrazí. Nastavení termínu automaticky posune rozsah týdnů tak, aby odpovídal, ale jen dokud si týden nezvolíte sami — poté zůstane vaše volba.',
        'Zapněte Opakování pro něco pravidelného. Zvolte Denně, Týdně nebo Měsíčně, pomocí Každý nastavte řidší opakování (například každé 2 týdny) a volitelně nastavte Do kdy pro jeho zastavení. Každý výskyt se odškrtává samostatně, takže dokončení tohoto týdne nechá příští týden nedotčený.',
        'V řádku úkolu klepněte na kroužek pro jeho dokončení. Ikony vedle, na mobilu skryté v nabídce, přidají úkol na Kanban nástěnku, umožní jej upravit, sdílet do týmu Spolupráce nebo smazat. Sdílení jde rovnou do vašeho týmu, pokud máte jen jeden, jinak se zeptá, do kterého.',
        'Úkoly s dnešním termínem se shromažďují v pruhu nad seznamem. Ikona hodin nastaví konkrétní čas připomenutí, X skryje daný úkol jen na tento den. Zda se upozornění zobrazují v aplikaci, jako notifikace, nebo obojí, se nastavuje v Nastavení, Obecné, Upozornění na termín úkolu, což ve výchozím stavu je Žádná. Nastavíte-li režim na Notifikace nebo Obojí, získáte navíc Čas upozornění na další den, který je ve výchozím stavu 18:00.',
        'Pokud úkol trvá několik týdnů, Nastavení, Obecné, Chování rozsahu úkolu určuje, zda se odškrtává jednou celkově, nebo jednou za týden.',
      ],
    },
    kanban: {
      title: 'Kanban',
      summary: 'Přesouvejte práci mezi sloupci, dokud není hotová.',
      body: [
        'Nástěnka řadí práci podle fáze, nikoli podle data, což se hodí pro vše, co prochází kroky. Přidejte kartu pomocí Přidat kartu dole ve sloupci, poté ji uložte klávesou Enter nebo zrušte klávesou Escape.',
        'Přetahujte karty mezi sloupci, nebo použijte šipky vlevo a vpravo v nabídce karty. Na telefonu před přetažením chvíli podržte prst. Dosažení posledního sloupce se počítá jako hotovo a spustí konfety. Sloupce se na mobilu sbalují pomocí šipky v záhlaví.',
        'Otevřete kartu ikonou šipky a nastavte prioritu, termín, předmět a kontrolní seznam. Přidat položku vytvoří položku kontrolního seznamu. Dialog se uloží při zavření, i kliknutím mimo něj, takže neexistuje samostatné tlačítko pro zrušení.',
        'Kontrolní seznamy lze zobrazit na přední straně karty. Nastavení, Kanban, Náhled kontrolního seznamu Kanbanu nabízí Skrýt na kartách, což je výchozí volba, Zobrazit na všech kartách a Případ od případu. S volbou Případ od případu zapnete náhled u jednotlivých karet dvojím klepnutím na ně, což udrží rušné karty přehledné a podrobné karty rozbalené.',
        'Přidat do úkolů umístí kartu i do vašeho týdenního seznamu Úkolů, hodí se pro práci na nástěnce, která má zároveň termín. Automaticky přidat úkoly na nástěnku, ve stejné části nastavení a ve výchozím stavu vypnuté, dělá opak pro úkoly tohoto týdne.',
        'Vymazat hotové odstraní vše v posledním sloupci; Smazat vše vyprázdní celou nástěnku. Obojí se nejprve potvrzuje. Sloupce se přejmenovávají, přeřazují přetažením úchytu a přidávají v Nastavení, Kanban, přičemž tři původní sloupce nelze smazat.',
      ],
    },
    grades: {
      title: 'Známky',
      summary: 'Sledujte vážené složky a to, co ještě potřebujete.',
      body: [
        'Nejprve v Nastavení, Složky známky definujte, z čeho se každý předmět hodnotí. Přidat komponentu vytvoří řádek s výchozí vahou 25 %, takže váhy upravujte, dokud součet nebude 100 %. Do té doby zůstává červený.',
        'Na kartě Známky zadávejte skóre z 20 bodů, jak je získáváte. Velké číslo na každé kartě je váš dosažený výsledek, který počítá jen to, co už bylo ohodnoceno, a zčervená pod 9,5.',
        'Má-li jedna složka více hodnocených částí, stiskněte + na jejím řádku pro její rozdělení na části. První stisk vytvoří dvě části a vymaže hodnocení nadřazené složky, každý další přidá další část, přičemž váha nadřazené složky se mezi ně rovnoměrně rozdělí. Rozdělená složka je hodnocena jen prostřednictvím svých částí.',
        'Panel dole odpovídá na otázku, na které skutečně záleží: co potřebujete ze všeho zatím neohodnoceného, abyste dosáhli požadovaného cíle. Cílová známka je ve výchozím stavu 9,5, tedy hranice úspěchu, a lze ji zvýšit. Pokud by dosažení cíle vyžadovalo víc než 20, zobrazí se hláška, že to není dosažitelné, místo nesmyslného čísla.',
        'Patička sčítá váš kredity vážený semestrální průměr a kredity, které jste na cestě získat, přičemž předmět počítá od 9,5 nahoru. Pod tím mají minulé semestry každý svou závěrečnou známku a pole průměru studia bere váš předchozí průměr a počet semestrů, které pokrývá, a poté odhaduje, kde skončí celé studium po započtení tohoto semestru.',
      ],
    },
    calendar: {
      title: 'Kalendář',
      summary: 'Zobrazení dne, týdne, měsíce a roku pro vše s datem.',
      body: [
        'Čtyři zobrazení sdílejí jeden kalendář. Den a týden kreslí hodinovou mřížku pro podrobnosti během dne; měsíc a rok ukazují tvar celého období. Úkoly, události i svátky se zobrazují společně, barevně odlišené podle předmětu.',
        'V zobrazení dne nebo týdne přetažením dolů po hodinové mřížce vyhraďte čas. Časy se přichytávají po čtvrthodinách a cokoli kratší než 30 minut se zaokrouhlí nahoru na 30. Formulář události se otevře s těmito časy již vyplněnými. Přetažením do stran přes sloupce dnů vytvoříte něco, co trvá více dní.',
        'V zobrazení měsíce nebo roku ukazuje každý den až tři štítky a poté "+N dalších". Kliknutím na den zobrazíte vše, co v něm je, a přidáte k danému datu událost.',
        'Formulář události přijímá název, datum, čas začátku a konce, barvu a volitelnou poznámku. Ponechte čas začátku prázdný pro celodenní událost. Zapněte Více dnů pro druhé datové pole pro konec. Je-li připojen Google Calendar, získáte navíc přepínač pro každou událost, zda ji tam odeslat.',
        'Názvy se čtou i kvůli datům a časům, takže "schůzka pátek 15h-17h" přijde už vyplněná. Události pocházející z Google Calendar nebo kalendáře studia jsou zde jen ke čtení, protože je vlastní zdroj.',
      ],
    },
    focus: {
      title: 'Soustředění',
      summary: 'Časovač s přestávkami, které sedí tomu, jak skutečně pracujete.',
      body: [
        'Stiskněte Start a hodiny relace běží. Pauza a Reset jsou vždy k dispozici a během přestávky ji lze předčasně přeskočit.',
        'Ikona ozubeného kola otevře nastavení přestávek a oba druhy fungují nezávisle, takže můžete použít jeden nebo oba. Intervalové přestávky jsou ve výchozím stavu zapnuté na 25 minut práce a 5 minut přestávky, obvyklý tvar pomodora. Plánované přestávky naopak spouští se v pevných časech dne, což se hodí pro rozvrh, který už mezery má: nastavte hodinu a minutu, zvolte délku a stiskněte + pro přidání do seznamu.',
        'Stejný panel umožňuje nahradit slova zobrazovaná během soustředění a přestávky vlastními.',
        'V Nastavení, Soustředění, Po přestávce se rozhoduje, co přestávka udělá s vaším běžícím součtem. Reset časovače spustí počítání znovu, což se hodí pro počítání jednotlivých relací; pokračovat v počítání přenese součet dál, což se hodí pro měření celého dne. Režim upozornění na soustředění přidává signál při změně fáze: Žádná, Vibrace, Notifikace nebo Obojí.',
        'Zavření karty uprostřed relace vaše čísla nenafoukne. Pokud se vrátíte mnohem později, časovač pozná, že jste byli pryč, a pozastaví se, místo aby celou mezeru připsal jako soustředění.',
      ],
    },
    notes: {
      title: 'Poznámky',
      summary: 'Bohatý editor se složkami, vyhledáváním a matematikou.',
      body: [
        'Poznámky žijí ve složkách, které lze vnořovat přetažením jedné na druhou. Tlačítko + vytvoří poznámku, tlačítko složky vytvoří složku a dvojklik na název složky ji přejmenuje. Hledání filtruje za psaní, ikona mřížky přepíná mezi zobrazením seznamu a mozaiky a oblíbené poznámky se vždy řadí nahoru. Archiv je jemnější alternativou ke smazání: archivované poznámky opustí strom a shromažďují se za vlastním filtrem.',
        'Panel nástrojů zahrnuje tučné, kurzívu, přeškrtnuté, tři úrovně nadpisů, odrážkový, číslovaný a kontrolní seznam, citace, tabulky, bloky kódu, oddělovače, odkazy, barvu a velikost textu, a také zpět a znovu. Je zde i tlačítko mikrofonu tam, kde je podporováno diktování.',
        'Napište @ následované několika písmeny pro propojení úkolu podle názvu. Nabídne odpovídající otevřené úkoly, šipky vás jimi provedou a Enter vloží odkaz, čímž zůstane poznámka svázaná s prací, ke které patří.',
        'Řešení matematiky v Nastavení, Aplikace, Poznámky je vypnuté, dokud jej nezapnete. Po zapnutí ukončete řádek znakem = a stiskněte Enter pro vyřešení, včetně nerovnic a kvadratických rovnic. Tři podřazené volby, po zapnutí všechny aktivní, řídí řešení pro x, vykreslení vybrané rovnice jako grafu a to, zda se postup zobrazuje krok za krokem, nebo jen výsledek.',
        'Poznámky lze importovat z Markdownu a prostého textu a exportovat jako Markdown, prostý text, webovou stránku, Word nebo tisknout do PDF. Poznámky na plátně pro ruční psaní vyžadují zapnutou cloudovou synchronizaci, protože kresby jsou velké a ukládají se vzdáleně. Plátno má pero a gumu, pět tlouštěk a pět barev, z nichž jedna sleduje váš motiv. Guma odstraní celý tah, ne jen jeho část.',
      ],
    },
    eisenhower: {
      title: 'Eisenhowerova matice',
      summary: 'Třiďte úkoly podle naléhavosti a důležitosti.',
      body: [
        'Matice rozděluje práci podle dvou os, naléhavé a důležité, čímž vzniknou čtyři pole: udělat hned, naplánovat, delegovat a zahodit. Hodnota spočívá v oddělení toho, co je jen hlasité, od toho, na čem skutečně záleží, což plochý seznam skrývá.',
        'Vaše úkoly začínají v neroztříděném zásobníku. Přetáhněte každý do pole, které mu odpovídá, a přesuňte jej jinam, jakmile se to změní. Cokoli je více než týden po termínu zůstává mimo mřížku, aby starý nashromážděný dluh nezakryl aktuální obraz.',
        'Názvy a barvy kvadrantů si můžete změnit v nastavení aplikace, což se vyplatí, pokud klasické popisky neodpovídají tomu, jak o vlastní práci přemýšlíte.',
      ],
    },
    quickAction: {
      title: 'Rychlá akce',
      summary: 'Napište, co chcete, běžným jazykem.',
      body: [
        'Kdekoli stiskněte Ctrl+K pro její otevření, nebo na telefonech zapněte gesto trojitého klepnutí. Napište obyčejnou větu, stiskněte Enter a aplikace pozná, co jste mysleli. Zkratku lze v nastavení aplikace přenastavit.',
        'Pro jedinou položku "přidej úkol esej z matematiky zítra v 15h" nastaví název, předmět, datum i čas najednou. Funguje i priorita a opakování: "přidej úkol posilovna každé pondělí vysoká priorita".',
        'Vytváří i víc než úkoly. "přidej kanban kartu refaktoring" vytvoří kartu v prvním sloupci, "přidej kartu refaktoring na doing" ji umístí do pojmenovaného sloupce a "přidej událost v kalendáři přednáška 15h-17h" vytvoří časovanou událost.',
        'Zvládnout víc věcí najednou je tam, kde skutečně šetří čas. "přidej úkoly alfa, beta, gama" vytvoří tři. "přidej úkoly ppt 1, 2, 3" pochopí sdílenou předponu a vytvoří ppt 1, ppt 2 a ppt 3. "přidej úkoly alfa a beta na zítra a 18. 7. respektive" dá každému vlastní datum ve správném pořadí.',
        'Umí také pracovat s tím, co už existuje, a porovnávat vaše slova volně s názvy vašich úkolů, aniž byste je museli psát přesně: "smaž nákup", "sdílej poznámky se studijní skupinou", "otevři nastavení", "spusť soustředění 20m 5m přestávka", "přeskoč přestávku". Fungují i známky, jako "známka 15 na zápočtový test z matematiky".',
        'Vše zde se řídí jazykem vaší aplikace, takže příkazy fungují v jakémkoli jazyce, který právě používáte.',
      ],
    },
    googleCalendar: {
      title: 'Synchronizace s Google Calendar',
      summary: 'Obousměrná synchronizace s vaším Google kalendářem.',
      body: [
        'Propojte jednou vložením ID klienta Google podle číslovaných kroků v aplikaci. Poté se synchronizuje sama každých pár minut a kdykoli se vrátíte do okna.',
        'Synchronizace probíhá oběma směry. Události z Googlu se zobrazují spolu se vším ostatním a události, které vytvoříte zde, lze odeslat přes přepínač ve formuláři události. Pokud se stejná událost změní na obou místech, vyhrává novější úprava. Smazání synchronizované události zde ji odstraní i z Googlu.',
      ],
    },
    eiCalendar: {
      title: 'Kalendář studia',
      summary: 'Oficiální termíny studia, načtené automaticky.',
      body: [
        'Pokud váš semestr používá podporovanou předvolbu studia, načte se veřejný kalendář studia a vyfiltruje se pro váš ročník, takže vidíte jen termíny, které se skutečně týkají vás, místo všech ročníků najednou.',
        'Tyto položky jsou jen ke čtení, protože je vlastní studium. Aktualizují se, když se aktualizuje studium, takže oficiální termíny přicházejí, aniž byste cokoli sami přepisovali.',
        'Dostupné pouze pro studium EI.',
      ],
    },
    pomodoro: {
      title: 'Pomodoro rajčata',
      summary: 'Rajče za každou dokončenou relaci soustředění.',
      body: [
        'Zapněte toto v mřížce Aplikace a každý dokončený interval soustředění upustí rajče do karty. Delší relace vypěstují větší rajčata a opuštění relace v polovině zanechá menší vybledlé rajče, takže hromádka zůstává čestným záznamem, ne poličkou trofejí. Existuje krátká ochranná lhůta pro zrušení právě dokončené relace, aniž by se počítala.',
        'Rajčata jsou fyzická. Táhněte je a švihejte s nimi, poskakují a usazují se, a na telefonu, který to podporuje, naklonění zařízení mění směr, kterým padají. Zobrazit globální překryv nad všemi kartami je nechá plavat po celé aplikaci, ne jen v Soustředění.',
        'Odznak nad kolem otevře statistiky. Tam získáte součty za období a celkově, počty opuštěných, aktuální a nejlepší denní série, sloupcový graf soustředění za den tento týden a šestiměsíční trend. Kopírovat souhrn vloží textovou verzi do schránky.',
        'Reset období určuje, co znamená "toto období": denně, týdně, což je výchozí volba, měsíčně nebo za semestr. Zobrazit pomodora za období a Sledovat statistiky období jsou samostatné přepínače, takže si můžete ponechat statistiky bez odznaku, i když vypnutí odznaku zastaví i sledování.',
      ],
    },
    standby: {
      title: 'Pohotovost',
      summary: 'Změňte telefon v dokovací stanici na stolní displej.',
      body: [
        'Pohotovost se objeví sama, jakmile telefon otočíte na šířku, takže se opřený telefon promění ve stolní displej, aniž byste cokoli otevírali. Obrazovka během běhu zůstává rozsvícená.',
        'Zvolte jeden až tři panely a co každý zobrazuje: kolo hodin, čas, váš kalendář, časovač soustředění, Kanban nástěnku nebo úkoly podle kategorie. Každý panel může nést menší druhý podpanel dole, čímž získáte časovač a seznam úkolů vedle sebe během práce.',
      ],
    },
    firebaseSync: {
      title: 'Cloudová synchronizace',
      summary: 'Udržujte více zařízení v kroku.',
      body: [
        'Cloudová synchronizace propojí aplikaci s projektem Firebase, který vlastníte, takže vaše data leží ve vašem vlastním účtu, nikoli v cizí službě. Aplikace vás provede čtyřmi kroky: vytvořit projekt, zapnout Firestore, zkopírovat konfiguraci z nastavení projektu a vložit ji. Před uložením ověří připojení.',
        'Jakmile jste propojeni, změna na jednom zařízení dorazí na ostatní během pár sekund. Zároveň zvyšuje limit místního úložiště, o čem je varování o úložišti, když se objeví, a je to i to, co poznámky na plátně potřebují k fungování.',
        'Synchronizaci lze end-to-end zašifrovat, takže ani ten, kdo umí číst vaši databázi, nemůže číst vaše data. Pokud se připojíte bez ní, budete varováni a nabídnuto Zašifrovat teď. Tato přístupová fráze je oddělená od šifrování v zařízení: nastavení jedné nenastaví druhou a zařízení odemykající jednu může stále potřebovat i druhou.',
      ],
    },
    collab: {
      title: 'Spolupráce',
      summary: 'Sdílejte úkoly a karty s dalšími lidmi.',
      body: [
        'Spolupráce nejprve potřebuje fungující cloudovou synchronizaci, poté jednorázové nastavení ve vaší konzoli Firebase: zveřejnit bezpečnostní pravidla, která vám aplikace ukáže, a zapnout anonymní přihlášení. Návod provede všemi čtyřmi kroky a poté spolupráci zapnete ze stejného panelu.',
        'Vytvořte tým a poté do něj sdílejte lidi pomocí pozvánkového odkazu. Pozvánky mají vlastní platnost, ve výchozím stavu jeden den, oddělenou od toho, jak dlouho trvá samotný tým. Odkaz obsahuje klíč potřebný ke čtení týmu, takže s ním zacházejte jako s heslem a pošlete nový, pokud vyprší platnost.',
        'Dvě nastavení na tým určují jeho chování a měnit je může jen hostitel. Sdílené dokončování úkolů je buď přepínač pro všechny, výchozí volba, kdy jeden člověk odškrtnutím vymaže úkol pro všechny, nebo osobní dokončování, kdy si každý člen sleduje své vlastní. Oprávnění k úpravě úkolů jsou buď otevřená všem, výchozí volba, nebo jen pro hostitele.',
        'Hostitel může tým přejmenovat, generovat pozvánky a smazat jej. Členové mohou odejít. V obou případech, pokud jste do týmu sdíleli vlastní místní úkoly, aplikace se zeptá, zda si tyto kopie ponechat ve svém zařízení, nebo je odstranit spolu s ním.',
      ],
    },
    dataTransfer: {
      title: 'Export a import',
      summary: 'Přesuňte svá data jako soubor.',
      body: [
        'Export JSON zapíše vše do souboru a Import JSON jej zase načte zpět. Jde o snímek, nikoli živé propojení, což se hodí pro zálohy a přechod na nové zařízení, ale ne pro udržení dvou zařízení ve shodě. Pro to použijte cloudovou synchronizaci.',
        'Se zapnutým šifrováním nabízí export volbu: zašifrovaný formát organizátoru, nebo čitelný prostý JSON. Ten čitelný se snadno kontroluje, ale je zcela nechráněný, takže s tímto souborem zacházejte opatrně.',
        'Pro menší množství dat existuje také Kopírovat odkaz ke sdílení a QR kód, což je nejrychlejší způsob, jak přenést nastavení na zařízení vedle vás. Velmi rozsáhlý stav se do odkazu nevejde a aplikace vám to sdělí.',
      ],
    },
    settings: {
      title: 'Nastavení',
      summary: 'Semestr, předměty, vzhled a aplikace.',
      body: [
        'Poprvé postupujte shora dolů. Nastavte název semestru a jeho data začátku a konce, počet týdnů se dopočítá sám. Poté přidejte předměty, každý s kredity a barvou, a případné svátky. Většina aplikace se od nich odvíjí, takže jsou na prvním místě. Načíst předvolbu umí vyplnit data a předměty pro známé studium.',
        'Dva přepínače mění, k čemu aplikace slouží. Pracovní režim přejmenuje předměty na skupiny a skryje známky i kredity, pro použití mimo studium. Režim bez semestru zcela zruší systém semestrů a počítá místo toho obyčejné roční týdny. Obecné také obsahuje tři barvy motivu, zda se nové úkoly zobrazují v kalendáři, jak se odškrtávají vícetýdenní úkoly, a nastavení upozornění na termín.',
        'Navbar přeřazuje karty přetažením, přejmenovává je, skrývá ty, které nepoužíváte, a zbylé seskupuje do složek. Zobrazit volí ikony, názvy, nebo obojí, a na telefonu může lišta sedět dole nebo po straně.',
        'Aplikace je místo, kde se funkce zapínají a vypínají, včetně Poznámek, Pomodora, Pohotovosti, Eisenhowerovy matice a integrací kalendáře. Vypnutí aplikace smaže data dané aplikace, takže se nejprve zeptá.',
        'Šifrování uzamkne data tohoto zařízení za přístupovou frází o délce alespoň osmi znaků, s volitelnou nápovědou a dvanáctislovným záložním kódem zobrazeným jednou. Uložte si tento kód někam jinam, protože je to jediná cesta zpět, pokud přístupovou frázi zapomenete. Později můžete přístupovou frázi změnit, vydat nový záložní kód nebo otočit klíč, což znovu zašifruje vše a přiměje ostatní zařízení se znovu odemknout.',
        'Nebezpečná zóna dole smaže semestr a jeho úkoly, známky i nástěnku a vymaže data pomodora. Každá volba se nejprve potvrzuje.',
      ],
    },
  },
}
