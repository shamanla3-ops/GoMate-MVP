import type { SeoCity, SeoIntent, SeoLang } from "./types";

export type SeoCopyBlock = {
  title: (city: SeoCity) => string;
  description: (city: SeoCity) => string;
  h1: (city: SeoCity) => string;
  paragraphs: ((city: SeoCity) => string)[];
  benefits: [string, string, string];
};

function plW(city: SeoCity): string {
  return city.locativePl ? `w ${city.locativePl}` : `w ${city.name}`;
}

function ukU(city: SeoCity): string {
  return city.locativeUk ? `у ${city.locativeUk}` : `у ${city.name}`;
}

function ruV(city: SeoCity): string {
  return city.locativeRu ? `в ${city.locativeRu}` : `в ${city.name}`;
}

const COPY: Record<SeoLang, Record<SeoIntent, SeoCopyBlock>> = {
  pl: {
    shared_rides: {
      title: (c) =>
        `Wspólne przejazdy ${c.name} — taniej i wygodniej | GoMate`,
      description: (c) =>
        `Szukasz dojazdu w ${c.name}? GoMate łączy kierowców i pasażerów na tych samych trasach: mniej kosztów, mniej przesiadek, szybciej niż komunikacja. Sprawdź dostępne przejazdy.`,
      h1: (c) => `Wspólne przejazdy ${plW(c)}`,
      paragraphs: [
        (c) =>
          `Codzienne dojazdy do pracy i na studia w ${c.name} często oznaczają tłok, przesiadki i niepewny czas dojazdu. Wspólne przejazdy to prosty sposób, by jechać tą samą trasą co ktoś z sąsiedztwa — dzielicie koszt paliwa, a Ty zyskujesz spokojniejszy start dnia.`,
        (c) =>
          `Na GoMate publikujemy przejazdy od osób, które faktycznie jadą: stałe trasy, jednorazowe kursy i propozycje „mam wolne miejsce”. Dzięki temu łatwiej znaleźć kierunki zbliżone do Twojej dom-praca lub dom-uczelnia w ${c.name}, bez przepłacania za taksówkę.`,
        (c) =>
          `Dla wielu mieszkańców ${c.name} ważny jest też czas: mniej postojów niż w komunikacji na trasach poza ścisłym centrum i często szybszy dojazd punkt-do-punktu. Dodatkowo, gdy w aucie jest kilka osób zamiast kilku osobnych aut, zmniejsza się też ślad CO₂ — to realna, mała zmiana przy codziennej mobilności.`,
        (_c) =>
          `Zacznij od przejrzenia dostępnych przejazdów i zapisz szablon trasy, jeśli regularnie pokonujesz ten sam odcinek. GoMate pomaga w jednym miejscu: znaleźć kierunek, dogadać szczegóły i wracać do podróży, gdy tylko pojawi się kolejny kurs.`,
      ],
      benefits: [
        "Niższy koszt dojazdu dzięki dzieleniu paliwa",
        "Szybszy punkt-do-punktu niż przy wielu przesiadkach",
        "Mniejszy ślad CO₂ niż przy samodzielnych przejazdach",
      ],
    },
    commute: {
      title: (c) =>
        `Dojazdy do pracy ${c.name} — szybciej i taniej | GoMate`,
      description: (c) =>
        `Dojazdy do pracy w ${c.name}: znajdź stałe lub elastyczne wspólne kursy, ogranicz koszty i stres. GoMate łączy ludzi na podobnych trasach — sprawdź dostępne przejazdy.`,
      h1: (c) => `Dojazdy do pracy ${plW(c)}`,
      paragraphs: [
        (c) =>
          `Poranny dojazd w ${c.name} bywa najbardziej kosztowną częścią dnia — nie tylko w pieniądzach, ale w energii. Wspólne dojazdy do pracy pozwalają ustalić godzinę, punkt odbioru i wracać do podobnego rytmu tygodnia bez codziennego „szukania opcji”.`,
        (_c) =>
          `Jeśli pracujesz w innym rejonie miasta niż mieszkasz, często wygrywa prosty rachunek: jedna trasa zamiast kilku odcinków komunikacji. Kierowcy na GoMate dodają realne trasy — od dzielnic po parki biurowe — więc łatwiej znaleźć przejazd zbliżony do Twojej ścieżki.`,
        (c) =>
          `Dla zespołów i zmianowych godzin ważna jest też elastyczność: jednorazowy przejazd, gdy autobus jest przepełniony, albo stała „środa” w jednym kierunku. GoMate nie jest taksówką — to platforma, która łączy ludzi na podobnych trasach w ${c.name}.`,
        (_c) =>
          `Dodatkowo, gdy kilka osób jedzie jednym samochodem, zmniejsza się też ślad emisji w porównaniu do kilku osobnych aut na tej samej trasie. To mała zmiana, która skaluje się przy codziennych dojazdach.`,
      ],
      benefits: [
        "Stałe i elastyczne propozycje na podobnych trasach",
        "Niższy koszt niż solo przejazd samochodem",
        "Mniej stresu przy przewidywalnym dojeździe",
      ],
    },
    cheap_rides: {
      title: (c) =>
        `Tanie przejazdy ${c.name} — wspólne kursy | GoMate`,
      description: (c) =>
        `Szukasz taniego dojazdu w ${c.name}? Sprawdź wspólne przejazdy na GoMate: dzielenie kosztów paliwa, przejrzyste zasady i trasy publikowane przez kierowców.`,
      h1: (c) => `Tanie przejazdy ${plW(c)}`,
      paragraphs: [
        (_c) =>
          `Tani przejazd nie musi oznaczać kompromisu w bezpieczeństwie. W modelu wspólnych kursów płacisz za realną część trasy — paliwo i czas kierowcy — zamiast za przepustowość całego auta tylko dla siebie.`,
        (c) =>
          `W ${c.name} wielu kierowców i tak pokonuje podobne odcinki w godzinach szczytu. Gdy dołożysz się do przejazdu, często wychodzi taniej niż taksówka, a przy regularnych trasach — wygodniej niż szukanie promocji na każdy dzień osobno.`,
        (_c) =>
          `GoMate stawia na przejrzystość: widzisz kierunek, czas i zasady uczestnictwa. To nie „losowy lift” — to zaplanowane przejazdy z jasnymi oczekiwaniami.`,
        (_c) =>
          `Dodatkowo, gdy kilka osób jedzie jednym autem, dzielicie nie tylko koszt, ale też emisję CO₂ z tej samej trasy. To prosty sposób, by jechać taniej i trochę lżej dla środowiska.`,
      ],
      benefits: [
        "Niższy koszt dzięki dzieleniu paliwa",
        "Przejrzyste przejazdy i trasy od kierowców",
        "Mniejszy ślad CO₂ niż solo przejazdy",
      ],
    },
  },
  de: {
    shared_rides: {
      title: (c) =>
        `Mitfahrgelegenheit ${c.name} — günstiger & entspannter | GoMate`,
      description: (c) =>
        `Mitfahrgelegenheiten in ${c.name}: Fahrten teilen, Kosten sparen, Stress reduzieren. GoMate verbindet Fahrer und Mitfahrer auf ähnlichen Routen — jetzt Fahrten entdecken.`,
      h1: (c) => `Mitfahrgelegenheit in ${c.name}`,
      paragraphs: [
        (c) =>
          `Pendeln in ${c.name} kostet Zeit und Energie — besonders zu Stoßzeiten. Wenn du eine Strecke mit anderen teilst, splittet ihr die Spritkosten und fahrt oft direkter als mit mehreren Umstiegen.`,
        (_c) =>
          `GoMate zeigt echte Fahrten von Menschen, die ohnehin unterwegs sind: einmalige Touren, wiederkehrende Routen und spontane freie Plätze. So findest du eher eine Fahrt, die zu deinem Start- und Zielgebiet passt.`,
        (_c) =>
          `Viele Strecken außerhalb des Innenstadtkerns sind im Auto schneller als mit mehrfachen Umstiegen. Gleichzeitig ist es einfacher, wenn du nicht jeden Tag ein neues Ticket oder eine neue Verbindung zusammenklicken musst.`,
        (_c) =>
          `Wenn mehrere Personen in einem Auto fahren statt in drei separaten, sinkt die CO₂-Belastung pro Person auf derselben Route. Das ist eine kleine Entscheidung, die sich bei täglichen Fahrten summiert.`,
      ],
      benefits: [
        "Kosten teilen statt allein bezahlen",
        "Oft schneller als mit vielen Umstiegen",
        "Weniger CO₂ als drei Fahrzeuge für dieselbe Strecke",
      ],
    },
    commute: {
      title: (c) =>
        `Pendeln in ${c.name} — gemeinsam günstiger | GoMate`,
      description: (c) =>
        `Pendeln in ${c.name} mit gemeinsamen Fahrten: ähnliche Routen, weniger Kosten, weniger Stress. GoMate verbindet Fahrer und Mitfahrer — praktisch für den Alltag.`,
      h1: (c) => `Pendeln in ${c.name} mit GoMate`,
      paragraphs: [
        (_c) =>
          `Regelmäßige Arbeitswege brauchen Planbarkeit — nicht nur eine günstige Einzeloption, sondern eine Routine. Gemeinsame Fahrten helfen, Startzeit und Treffpunkt zu vereinbaren und den Alltag vorhersehbarer zu machen.`,
        (c) =>
          `In ${c.name} gibt es viele parallele Routen zwischen Wohngebieten und Bürolagen. Wenn du eine Strecke teilst, kannst du oft die Kosten für den Tank splitten und trotzdem flexibel bleiben.`,
        (_c) =>
          `GoMate ist keine Taxi-App: Es geht darum, Menschen mit ähnlichen Wegen zu verbinden. Das macht Pendeln oft entspannter, weil du weniger „neu organisieren“ musst.`,
        (_c) =>
          `Wenn mehrere Personen in einem Auto fahren, ist die CO₂-Last pro Person pro Strecke geringer als bei vielen Einzelfahrten. Das ist eine sinnvolle, alltagstaugliche Entscheidung.`,
      ],
      benefits: [
        "Mehr Planbarkeit für wiederkehrende Routen",
        "Kosten splitten statt allein im Stau zu stehen",
        "Weniger CO₂ pro Person auf derselben Strecke",
      ],
    },
    cheap_rides: {
      title: (c) =>
        `Günstige Fahrten ${c.name} — Mitfahrgelegenheiten | GoMate`,
      description: (c) =>
        `Günstige Fahrten in ${c.name}: Mitfahrgelegenheiten mit Kostenaufteilung, klare Erwartungen und echte Routen von Fahrerinnen und Fahrern.`,
      h1: (c) => `Günstige Fahrten in ${c.name}`,
      paragraphs: [
        (_c) =>
          `„Günstig“ heißt hier nicht „riskant“, sondern: du zahlst einen fairen Anteil an der Tankkosten und Zeit der Fahrt — statt den ganzen Wagen allein zu finanzieren.`,
        (c) =>
          `In ${c.name} gibt es viele parallele Wege in Stoßzeiten. Wenn du eine Strecke mit anderen teilst, kann das günstiger sein als eine Taxi-Fahrt und entspannter als ein komplizierter ÖPNV-Detour.`,
        (_c) =>
          `GoMate setzt auf Transparenz: Route, Zeit und Rahmenbedingungen sind klar. Das ist wichtig, damit Mitfahren im Alltag funktioniert.`,
        (_c) =>
          `Wenn mehrere Personen in einem Auto fahren, sinkt die CO₂-Belastung pro Person im Vergleich zu mehreren Einzelfahrten. Das ist eine kleine Entscheidung mit großer Wirkung bei täglicher Nutzung.`,
      ],
      benefits: [
        "Kosten teilen statt allein bezahlen",
        "Klare Fahrten mit echten Routen",
        "Weniger CO₂ als viele Einzelfahrten",
      ],
    },
  },
  es: {
    shared_rides: {
      title: (c) =>
        `Compartir coche en ${c.name} — más barato y cómodo | GoMate`,
      description: (c) =>
        `Compartir coche en ${c.name}: divide costes, evita complicaciones y encuentra rutas reales. GoMate conecta conductores y pasajeros con trayectos similares.`,
      h1: (c) => `Compartir coche en ${c.name}`,
      paragraphs: [
        (c) =>
          `Moverse cada día por ${c.name} puede costar tiempo y dinero: atascos, transbordos y horarios apretados. Compartir coche con personas que van en una dirección parecida te permite repartir combustible y llegar más directo a tu destino.`,
        (_c) =>
          `En GoMate verás trayectos publicados por personas que ya van a conducir: rutas puntuales, habituales y con plazas libres. Esas propuestas suelen encajar mejor con desplazamientos casa–trabajo o campus–trabajo que una búsqueda genérica.`,
        (_c) =>
          `En muchas rutas periféricas, ir en coche puede ser más rápido que encadenar varias líneas. Además, compartir una sola ruta reduce el estrés de planificar cada día desde cero.`,
        (_c) =>
          `Cuando varias personas van en un mismo coche en lugar de tres coches separados, también se reduce la huella de CO₂ por persona en el mismo trayecto. Es un cambio pequeño que suma si se usa a diario.`,
      ],
      benefits: [
        "Menos coste al repartir combustible",
        "A menudo más rápido que muchos transbordos",
        "Menos CO₂ que tres coches para la misma ruta",
      ],
    },
    commute: {
      title: (c) =>
        `Ir al trabajo en ${c.name} — comparte coche | GoMate`,
      description: (c) =>
        `Ir al trabajo en ${c.name} con trayectos compartidos: rutas parecidas, menos coste y más calma. GoMate conecta conductores y pasajeros para el día a día.`,
      h1: (c) => `Ir al trabajo en ${c.name} con GoMate`,
      paragraphs: [
        (_c) =>
          `El desplazamiento diario necesita una mínima previsibilidad: hora, punto de encuentro y una ruta que se repita. Compartir coche con personas que hacen un camino parecido te ayuda a construir esa rutina sin depender solo de promociones o cambios de última hora.`,
        (c) =>
          `En ${c.name} hay muchas rutas paralelas entre barrios y polígonos. Si compartes un trayecto, puedes dividir costes y seguir siendo flexible cuando lo necesitas.`,
        (_c) =>
          `GoMate no es un taxi: es una forma de conectar personas con rutas similares. Eso suele hacer el día a día más cómodo porque reduces fricción al planificar.`,
        (_c) =>
          `Además, si varias personas van en un mismo vehículo, la huella de CO₂ por persona en esa ruta es menor que si cada uno va solo. Es un impacto positivo que se nota cuando se repite.`,
      ],
      benefits: [
        "Más rutinas para trayectos repetidos",
        "Costes compartidos en lugar de pagar todo tú",
        "Menos CO₂ que muchos coches en la misma ruta",
      ],
    },
    cheap_rides: {
      title: (c) =>
        `Viajes baratos en ${c.name} — comparte coche | GoMate`,
      description: (c) =>
        `Viajes baratos en ${c.name}: comparte costes, encuentra rutas reales y conduce con expectativas claras. GoMate conecta conductores y pasajeros.`,
      h1: (c) => `Viajes baratos en ${c.name}`,
      paragraphs: [
        (_c) =>
          `Un viaje barato no tiene por qué ser poco claro. Aquí pagas una parte proporcional del combustible y del tiempo de ruta — en lugar de financiar el coche completo solo para ti.`,
        (c) =>
          `En ${c.name} hay muchas rutas paralelas en horas punta. Compartir coche puede salir más barato que un taxi y, en algunos trayectos, ser más cómodo que un recorrido largo en transporte público.`,
        (_c) =>
          `GoMate apuesta por la transparencia: ruta, hora y reglas. Eso es lo que hace viable compartir en el día a día.`,
        (_c) =>
          `Si varias personas comparten un mismo vehículo, la huella de CO₂ por persona en esa ruta es menor que si cada uno va en su coche. Es un pequeño cambio con efecto acumulado.`,
      ],
      benefits: [
        "Costes compartidos en lugar de pagar todo tú",
        "Rutas claras publicadas por conductores",
        "Menos CO₂ que muchos coches en la misma ruta",
      ],
    },
  },
  en: {
    shared_rides: {
      title: (c) =>
        `Shared rides in ${c.name} — split costs & save time | GoMate`,
      description: (c) =>
        `Find shared rides in ${c.name} on GoMate: split fuel costs, skip awkward transfers, and travel with people driving similar routes.`,
      h1: (c) => `Shared rides in ${c.name}`,
      paragraphs: [
        (c) =>
          `Daily commutes in ${c.name} are often expensive in both money and time — crowded buses, multiple transfers, and unpredictable arrival times. Shared rides let you join someone who is already driving a similar direction, so you split fuel instead of paying for a whole car alone.`,
        (_c) =>
          `On GoMate, drivers publish real trips: one-off rides, recurring routes, and “I have a spare seat” offers. That makes it easier to find something closer to your home-to-work or home-to-campus pattern.`,
        (_c) =>
          `On many cross-city routes, a direct car trip can beat a long chain of connections — especially outside the core. You also avoid re-planning every single morning from scratch.`,
        (_c) =>
          `When multiple people share one car instead of taking three separate cars, CO₂ per person on the same route drops. It is a small choice that scales when repeated daily.`,
      ],
      benefits: [
        "Lower cost by splitting fuel",
        "Often faster than many transfers",
        "Lower CO₂ than three solo cars on the same route",
      ],
    },
    commute: {
      title: (c) =>
        `Commute in ${c.name} — carpool for work | GoMate`,
      description: (c) =>
        `Commute in ${c.name} with shared carpool routes: similar journeys, lower cost, less stress. GoMate connects drivers and passengers for everyday travel.`,
      h1: (c) => `Commute in ${c.name} with GoMate`,
      paragraphs: [
        (_c) =>
          `A reliable commute needs predictability — not just a cheap one-off ticket, but a repeatable rhythm. Carpooling helps you align pickup time and route with people who travel a similar way.`,
        (c) =>
          `In ${c.name} there are many parallel routes between suburbs and business districts. Sharing a ride lets you split fuel costs while staying flexible when you need it.`,
        (_c) =>
          `GoMate is not a taxi network: it is about matching similar routes. That often reduces daily friction because you spend less time re-negotiating every trip.`,
        (_c) =>
          `When several people ride together, emissions per person on that route are typically lower than everyone driving alone. It is a practical choice for everyday mobility.`,
      ],
      benefits: [
        "Better repeatability for weekly routes",
        "Split costs instead of driving solo",
        "Lower emissions per person on the same route",
      ],
    },
    cheap_rides: {
      title: (c) =>
        `Cheap rides in ${c.name} — split fuel & share trips | GoMate`,
      description: (c) =>
        `Find cheaper rides in ${c.name} by sharing real journeys: split fuel costs, clear expectations, and routes posted by drivers on GoMate.`,
      h1: (c) => `Cheap rides in ${c.name}`,
      paragraphs: [
        (_c) =>
          `A cheaper ride does not have to mean “risky”. You pay a fair share of fuel and time for the route — instead of paying for an entire private car on your own.`,
        (c) =>
          `In ${c.name} many people travel similar corridors at peak times. Sharing a ride can be cheaper than a taxi and simpler than stitching together multiple connections.`,
        (_c) =>
          `GoMate focuses on clarity: route, time, and expectations. That is what makes shared rides workable in real life.`,
        (_c) =>
          `When multiple people share one vehicle, CO₂ per person on that route is typically lower than many solo trips. Small daily choices add up.`,
      ],
      benefits: [
        "Split fuel instead of paying for the whole car",
        "Clear routes posted by drivers",
        "Lower CO₂ than many solo rides",
      ],
    },
  },
  uk: {
    shared_rides: {
      title: (c) =>
        `Спільні поїздки ${ukU(c)} — дешевше й зручніше | GoMate`,
      description: (c) =>
        `Шукаєте спільної поїздки ${ukU(c)}? GoMate з’єднує водіїв і пасажирів на схожих маршрутах: менше витрат на пальне, менше пересадок, зрозуміліший час доїзду.`,
      h1: (c) => `Спільні поїздки ${ukU(c)}`,
      paragraphs: [
        (c) =>
          `Щоденні поїздки на роботу чи навчання ${ukU(c)} часто перетворюються на гонитву за маршрутом: черги, пересадки й невизначеність, чи встигнеш на час. Коли ви їдете разом із тим, хто вже має заплановану дорогу, витрати на пальне ділите між кількома людьми — без зайвого «приватного» таксі лише для себе.`,
        (c) =>
          `На GoMate з’являються реальні оголошення: разові рейси, регулярні напрямки й вільні місця, які хтось уже їде взяти. Це допомагає знайти ближче до вашого «дім — офіс» або «дім — кампус» у ${c.name}, без нескінченного перебору варіантів у різних застосунках.`,
        (c) =>
          `Для багатьох мешканців ${c.name} важливий також час: маршрут «точка до точки» часто виграє у довгих ланцюжків громадського транспорту, особливо коли треба виїхати з району, не з центру. До того ж одна машина з кількома пасажирами зазвичай означає меншу навантаженість на кожного, ніж усі їдуть окремими авто.`,
        (_c) =>
          `Почніть із перегляду доступних поїздок і збережіть типовий маршрут, якщо їздите регулярно. GoMate тримає в одному місці: знайти напрямок, узгодити деталі й повторити поїздку, коли з’явиться наступний курс.`,
      ],
      benefits: [
        "Менша вартість за рахунок спільного пального",
        "Простіше планування «точка до точки»",
        "Менший вуглецевий слід, ніж у кількох окремих авто",
      ],
    },
    commute: {
      title: (c) =>
        `Доїзд на роботу ${ukU(c)} — спільні маршрути | GoMate`,
      description: (c) =>
        `Доїзд на роботу ${ukU(c)}: спільні поїздки на схожих маршрутах, менші витрати, менше стресу. GoMate підбирає водіїв і пасажирів для буднів.`,
      h1: (c) => `Доїзд на роботу ${ukU(c)} з GoMate`,
      paragraphs: [
        (c) =>
          `Ранковий доїзд до роботи ${ukU(c)} — це не лише гроші, а й енергія: пробки, години пік і постійне «чи встигну». Потрібен не разовий лайфхак, а хоча б мінімальна повторюваність: час, точка зустрічі й маршрут, який близький до вашого щоденного кола.`,
        (_c) =>
          `Коли кілька людей їдуть схожими коридорами між житловими районами й бізнес-зонами, спільна поїздка дозволяє розділити витрати на пальне й залишитись гнучкими, якщо треба змінити день.`,
        (_c) =>
          `GoMate — це не заміна таксі: платформа про людей, які насправді їдуть тією ж логікою маршруту. Це зменшує хаос «щодня шукати заново», якщо ви знайшли зручний напрямок.`,
        (_c) =>
          `Коли в одній машині кілька пасажирів замість кількох одноосібних поїздок, навантаження на кожного на тій самій трасі зазвичай нижче — і це помітно, якщо так їздити щодня.`,
      ],
      benefits: [
        "Простіше тижневе повторення маршруту",
        "Спільні витрати замість одного повного багажника",
        "Менше хаосу в ранкових переїздах",
      ],
    },
    cheap_rides: {
      title: (c) =>
        `Дешеві поїздки ${ukU(c)} — спільні рейси | GoMate`,
      description: (c) =>
        `Дешеві поїздки ${ukU(c)}: спільні поїздки з реальними маршрутами, зрозумілими умовами та оголошеннями від водіїв на GoMate.`,
      h1: (c) => `Дешеві поїздки ${ukU(c)}`,
      paragraphs: [
        (_c) =>
          `Дешево не означає «навіскид». Ви платите справедливу частку за пальне й час маршруту — тоді як весь автомобіль «тільки для мене» коштує дорожче за кожен кілометр.`,
        (c) =>
          `У години пік ${c.name} багато хто їде схожими коридорами. Спільна поїздка часто виглядає вигіднішою за таксі, а для довгих ділянок — простішою за кілька пересадок підряд.`,
        (_c) =>
          `GoMate тримається прозорості: напрямок, час і правила участі видно заздалегідь. Звідси й відчуття контролю — без зайвих «наосліп» домовленостей.`,
        (_c) =>
          `Коли кілька людей їдуть одним авто, вуглецевий слід на людину на тій самій трасі зазвичай менший, ніж у кількох окремих машинах. Це маленький щоденний вибір, який змінює картину в масштабі міста.`,
      ],
      benefits: [
        "Спільне пальне замість повної вартості авто",
        "Чіткі оголошення з реальними маршрутами",
        "Менший вуглецевий слід на людину на тій самій трасі",
      ],
    },
  },
  ru: {
    shared_rides: {
      title: (c) =>
        `Совместные поездки ${ruV(c)} — дешевле и удобнее | GoMate`,
      description: (c) =>
        `Ищете совместную поездку ${ruV(c)}? GoMate соединяет водителей и пассажиров на похожих маршрутах: меньше расходов на топливо, меньше пересадок и понятнее время в пути.`,
      h1: (c) => `Совместные поездки ${ruV(c)}`,
      paragraphs: [
        (c) =>
          `Ежедневные поездки на работу и учёбу ${ruV(c)} часто превращаются в гонку за маршрутом: очереди, пересадки и неопределённость, успеете ли вы. Когда вы едете вместе с тем, кто уже планирует дорогу, расходы на топливо делятся между несколькими людьми — без ощущения, что вы платите за целый автомобиль только для себя.`,
        (c) =>
          `На GoMate появляются реальные объявления: разовые поездки, регулярные направления и свободные места, которые кто-то уже собирается взять. Так проще найти что-то ближе к вашему «дом — офис» или «дом — кампус» в ${c.name}, без бесконечного перебора вариантов в разных приложениях.`,
        (c) =>
          `Для многих жителей ${c.name} важно и время: маршрут «от двери до двери» часто выигрывает у длинных цепочек общественного транспорта, особенно если выезжать нужно из спального района, а не из центра. Плюс одна машина с несколькими пассажирами обычно означает меньшую нагрузку на человека, чем если все едут отдельными авто.`,
        (_c) =>
          `Начните с просмотра доступных поездок и сохраните типовой маршрут, если ездите регулярно. GoMate держит в одном месте: найти направление, договориться о деталях и повторить поездку, когда появится следующий рейс.`,
      ],
      benefits: [
        "Меньше расходов за счёт совместного топлива",
        "Проще планировать «от двери до двери»",
        "Меньше CO₂ на человека, чем у нескольких отдельных авто",
      ],
    },
    commute: {
      title: (c) =>
        `Доезд на работу ${ruV(c)} — совместные маршруты | GoMate`,
      description: (c) =>
        `Доезд на работу ${ruV(c)}: совместные поездки на похожих маршрутах, меньше расходов и меньше стресса. GoMate подбирает водителей и пассажиров для будней.`,
      h1: (c) => `Доезд на работу ${ruV(c)} с GoMate`,
      paragraphs: [
        (c) =>
          `Утренний доезд до работы ${ruV(c)} — это не только деньги, но и энергия: пробки, часы пик и вечный вопрос «успею ли». Нужна не разовая удача, а хотя бы минимальная повторяемость: время, точка встречи и маршрут, который близок к вашему ежедневному кругу.`,
        (_c) =>
          `Когда несколько людей едут похожими коридорами между жилыми районами и деловыми центрами, совместная поездка позволяет делить расходы на топливо и оставаться гибкими, если нужно сменить день.`,
        (_c) =>
          `GoMate — это не замена такси: это про людей, которые реально едут по той же логике маршрута. Это снижает хаос «каждый день искать заново», если вы уже нашли удобное направление.`,
        (_c) =>
          `Когда в одной машине несколько пассажиров вместо нескольких одиночных поездок, нагрузка на человека на той же трассе обычно ниже — и это заметно, если так ездить каждый день.`,
      ],
      benefits: [
        "Проще недельное повторение маршрута",
        "Совместные расходы вместо полной стоимости авто",
        "Меньше хаоса в утренних переездах",
      ],
    },
    cheap_rides: {
      title: (c) =>
        `Дешёвые поездки ${ruV(c)} — совместные рейсы | GoMate`,
      description: (c) =>
        `Дешёвые поездки ${ruV(c)}: совместные поездки с реальными маршрутами, понятными условиями и объявлениями от водителей на GoMate.`,
      h1: (c) => `Дешёвые поездки ${ruV(c)}`,
      paragraphs: [
        (_c) =>
          `Дёшево не значит «непонятно». Вы платите справедливую долю за топливо и время маршрута — тогда как весь автомобиль «только для меня» обычно дороже за каждый километр.`,
        (c) =>
          `В часы пик ${c.name} многие едут похожими коридорами. Совместная поездка часто выглядит выгоднее такси, а на длинных участках — проще, чем несколько пересадок подряд.`,
        (_c) =>
          `GoMate опирается на прозрачность: направление, время и правила участия видны заранее. Отсюда и ощущение контроля — без лишних договорённостей «на глаз».`,
        (_c) =>
          `Когда несколько человек едут одной машиной, углеродный след на человека на той же трассе обычно ниже, чем у нескольких отдельных автомобилей. Это маленький ежедневный выбор, который меняет картину в масштабе города.`,
      ],
      benefits: [
        "Совместное топливо вместо полной стоимости авто",
        "Чёткие объявления с реальными маршрутами",
        "Меньше CO₂ на человека на той же трассе",
      ],
    },
  },
};

export function getSeoCopy(
  lang: SeoLang,
  intent: SeoIntent
): SeoCopyBlock {
  return COPY[lang][intent];
}
