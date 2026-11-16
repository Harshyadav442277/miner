"""Hand-written place lists for the WEATHER_FORECAST_VERIFY lane. No model wrote them, no miner answer informed them.

HOLDOUT_PLACES: "Name|admin1|CC" (admin1 may be empty), grouped by climate. Used only for the frozen holdout.
HOLDOUT_AMBIGUOUS: bare names shared by several real places; candidates are resolved at labelling time.
PILOT_PLACES: the three pilot places, excluded from the holdout.
Training places are drawn elsewhere (build_pairs.py) and must be disjoint from every list here.
"""

PILOT_PLACES = {"Reykjavik|Capital Region|IS", "Nairobi|Nairobi County|KE", "Denver|Colorado|US"}

HOLDOUT_PLACES = {
    "tropical": """Singapore||SG;Kuala Lumpur||MY;Bangkok||TH;Manila||PH;Jakarta||ID;Mumbai|Maharashtra|IN;Chennai|Tamil Nadu|IN;Kolkata|West Bengal|IN;
Colombo||LK;Dhaka||BD;Lagos|Lagos|NG;Accra||GH;Kinshasa||CD;Dar es Salaam||TZ;Miami|Florida|US;Honolulu|Hawaii|US;San Juan||PR;Havana||CU;
Panama City||PA;Bogota||CO;Medellin||CO;Caracas||VE;Rio de Janeiro|Rio de Janeiro|BR;Recife|Pernambuco|BR;Manaus|Amazonas|BR;Guayaquil||EC;
Darwin|Northern Territory|AU;Cairns|Queensland|AU;Hanoi||VN;Ho Chi Minh City||VN;Phnom Penh||KH;Yangon||MM;Abidjan||CI;Kampala||UG;Santo Domingo||DO;
Port Moresby||PG;Suva||FJ;Hyderabad|Telangana|IN;Bengaluru|Karnataka|IN;Kochi|Kerala|IN""",
    "arid": """Phoenix|Arizona|US;Las Vegas|Nevada|US;Tucson|Arizona|US;El Paso|Texas|US;Albuquerque|New Mexico|US;Dubai||AE;Riyadh||SA;Doha||QA;Kuwait City||KW;
Baghdad||IQ;Tehran||IR;Cairo||EG;Aswan||EG;Alice Springs|Northern Territory|AU;Perth|Western Australia|AU;Windhoek||NA;Lima||PE;Antofagasta||CL;
Karachi|Sindh|PK;Jodhpur|Rajasthan|IN;Tashkent||UZ;Ulaanbaatar||MN;Niamey||NE;Khartoum||SD;Djibouti||DJ;Marrakesh||MA;Tamanrasset||DZ;
Kalgoorlie|Western Australia|AU;Lubbock|Texas|US;Amarillo|Texas|US;Fresno|California|US;Boise|Idaho|US;Salt Lake City|Utah|US""",
    "mediterranean": """Los Angeles|California|US;San Diego|California|US;San Francisco|California|US;Sacramento|California|US;Barcelona||ES;Madrid||ES;Seville||ES;
Lisbon||PT;Rome||IT;Naples||IT;Athens||GR;Istanbul||TR;Beirut||LB;Tel Aviv||IL;Tunis||TN;Algiers||DZ;Marseille||FR;Palermo||IT;Valletta||MT;
Cape Town||ZA;Adelaide|South Australia|AU;Santiago||CL;Valparaiso||CL;Split||HR;Thessaloniki||GR;Izmir||TR;Faro||PT""",
    "temperate": """London||GB;Paris||FR;Berlin||DE;Hamburg||DE;Munich||DE;Amsterdam||NL;Brussels||BE;Dublin||IE;Edinburgh||GB;Manchester||GB;Vienna||AT;Zurich||CH;
Prague||CZ;Budapest||HU;Warsaw||PL;Copenhagen||DK;Seattle|Washington|US;Portland|Oregon|US;Vancouver|British Columbia|CA;Sydney|New South Wales|AU;
Melbourne|Victoria|AU;Brisbane|Queensland|AU;Auckland||NZ;Wellington||NZ;Christchurch||NZ;Buenos Aires||AR;Montevideo||UY;Porto Alegre|Rio Grande do Sul|BR;
Sao Paulo|Sao Paulo|BR;Tokyo||JP;Osaka||JP;Seoul||KR;Shanghai||CN;Hong Kong||HK;Taipei||TW;Washington|District of Columbia|US;Atlanta|Georgia|US;
Nashville|Tennessee|US;Charlotte|North Carolina|US;New Orleans|Louisiana|US;Houston|Texas|US;Dallas|Texas|US;Johannesburg||ZA;Durban||ZA;Kunming||CN;
Mexico City||MX;Guadalajara||MX;Monterrey||MX;Hobart|Tasmania|AU""",
    "continental": """Chicago|Illinois|US;New York|New York|US;Boston|Massachusetts|US;Philadelphia|Pennsylvania|US;Detroit|Michigan|US;Cleveland|Ohio|US;
Minneapolis|Minnesota|US;Kansas City|Missouri|US;St. Louis|Missouri|US;Omaha|Nebraska|US;Oklahoma City|Oklahoma|US;Toronto|Ontario|CA;Montreal|Quebec|CA;
Ottawa|Ontario|CA;Winnipeg|Manitoba|CA;Calgary|Alberta|CA;Edmonton|Alberta|CA;Moscow||RU;Saint Petersburg||RU;Kyiv||UA;Minsk||BY;Bucharest||RO;
Sofia||BG;Belgrade||RS;Beijing||CN;Harbin||CN;Shenyang||CN;Novosibirsk||RU;Almaty||KZ;Astana||KZ;Delhi|Delhi|IN;Lahore|Punjab|PK;Kabul||AF;
Helsinki||FI;Stockholm||SE;Oslo||NO;Riga||LV;Tallinn||EE;Sapporo||JP;Vladivostok||RU;Cincinnati|Ohio|US;Milwaukee|Wisconsin|US;Indianapolis|Indiana|US""",
    "cold_or_high": """Anchorage|Alaska|US;Fairbanks|Alaska|US;Juneau|Alaska|US;Reykjavik|Capital Region|IS;Tromso||NO;Murmansk||RU;Yakutsk||RU;Norilsk||RU;Whitehorse|Yukon|CA;
Yellowknife|Northwest Territories|CA;Iqaluit|Nunavut|CA;Nuuk||GL;Longyearbyen||SJ;Denver|Colorado|US;Cheyenne|Wyoming|US;Billings|Montana|US;
La Paz||BO;Quito||EC;Cusco||PE;Addis Ababa||ET;Nairobi|Nairobi County|KE;Mexico City||MX;Lhasa||CN;Kathmandu||NP;Thimphu||BT;Bishkek||KG;Innsbruck||AT;
Sapporo||JP;Bozeman|Montana|US;Flagstaff|Arizona|US;Leadville|Colorado|US;Ushuaia||AR;Punta Arenas||CL;Dunedin||NZ""",
    "disambiguated": """Paris|Texas|US;London|Ontario|CA;Birmingham|Alabama|US;Richmond|Virginia|US;Portland|Maine|US;Springfield|Massachusetts|US;Springfield|Missouri|US;
Columbia|South Carolina|US;Columbia|Missouri|US;Alexandria|Virginia|US;Victoria|British Columbia|CA;Valencia|Carabobo|VE;San Jose|California|US;
Rochester|Minnesota|US;Cambridge|Massachusetts|US;Newcastle|New South Wales|AU;Hamilton|Ontario|CA;Lincoln|Nebraska|US;Kingston|Ontario|CA;
Salem|Oregon|US;Athens|Georgia|US;Cordoba|Cordoba|AR;Windsor|Ontario|CA;Madison|Wisconsin|US;Oxford|Mississippi|US;Plymouth|Massachusetts|US;
Dover|Delaware|US;Bristol|Tennessee|US;Naples|Florida|US;Troy|New York|US;Moscow|Idaho|US;Odessa|Texas|US;Granada|Granada|NI;Santiago|Santiago|DO;
Perth|Tayside|GB;Georgetown|Texas|US;Aurora|Colorado|US;Franklin|Tennessee|US;Manchester|New Hampshire|US;Lima|Ohio|US;Syracuse|New York|US""",
}

HOLDOUT_AMBIGUOUS = """Springfield;Portland;Richmond;Columbia;Georgetown;Alexandria;Victoria;Valencia;Santiago;San Jose;Rochester;Cambridge;Birmingham;Newcastle;
Hamilton;London;Paris;Lincoln;Kingston;Salem;Auburn;Athens;Cordoba;Perth;Windsor;Aurora;Franklin;Clinton;Madison;Oxford;Plymouth;Dover;Bristol;Naples;
Troy;Moscow;Odessa;Granada;Medina;Arlington;Fairfield;Greenville""".replace("\n", "").split(";")


def parse(group_text):
    out = []
    for item in group_text.replace("\n", "").split(";"):
        item = item.strip()
        if item:
            name, admin1, cc = item.split("|")
            out.append((name, admin1, cc))
    return out


def all_places():
    seen, out = set(), []
    for group, text in HOLDOUT_PLACES.items():
        for p in parse(text):
            if p not in seen and "|".join(p) not in PILOT_PLACES:
                seen.add(p)
                out.append((group, *p))
    return out
