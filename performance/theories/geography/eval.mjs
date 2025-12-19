export const min_complex = 78;

export const evaluationTests = [
    {
        query: "China is in Asia and Beijing is its capital",
        expected_nl: [
            "Continental_Hierarchy",
            "Capital_Relation"
        ],
        proof_nl: [
            "China is a country that belongs to the region of Asia, which is part of the continent Asia",
            "Beijing is the capital of China and Beijing is a city"
        ]
    },
    {
        query: "The Nile River flows into the Mediterranean Sea through a delta",
        expected_nl: [
            "River_System",
            "Delta_Formation"
        ],
        proof_nl: [
            "The Nile is a river system with tributaries that flow into it and form a delta at its mouth",
            "The Nile Delta is formed by sediment deposition from the Nile River"
        ]
    },
    {
        query: "Mount Everest is the highest peak in the Himalayas mountain range",
        expected_nl: [
            "Mountain_Range"
        ],
        proof_nl: [
            "The Himalayas is a mountain range, Mount Everest is part of this range, and valleys are adjacent to the range"
        ]
    },
    {
        query: "The Amazon Rainforest has a tropical climate with high annual rainfall",
        expected_nl: [
            "Rainforest_Biome",
            "Climate_Zone"
        ],
        proof_nl: [
            "The Amazon is a rainforest located in a tropical region with high annual rainfall",
            "The tropical region has a tropical climate and specific vegetation patterns"
        ]
    },
    {
        query: "Japan is an island nation surrounded by the Pacific Ocean",
        expected_nl: [
            "Island_Nation"
        ],
        proof_nl: [
            "Japan is an island nation surrounded by the Pacific Ocean with a specific population"
        ]
    },
    {
        query: "The Sahara Desert is located in Africa and has an arid climate",
        expected_nl: [
            "Desert_Classification"
        ],
        proof_nl: [
            "The Sahara is a desert located in the African continent with an arid climate"
        ]
    },
    {
        query: "Russia and China share a land border",
        expected_nl: [
            "Border_Adjacency"
        ],
        proof_nl: [
            "Russia and China are both countries that share a border between them"
        ]
    },
    {
        query: "The Mediterranean Sea is connected to the Atlantic Ocean through the Strait of Gibraltar",
        expected_nl: [
            "Strait_Connection"
        ],
        proof_nl: [
            "The Strait of Gibraltar connects the Mediterranean Sea to the Atlantic Ocean"
        ]
    },
    {
        query: "Lake Baikal is a freshwater lake in Russia with significant depth",
        expected_nl: [
            "Lake_Classification"
        ],
        proof_nl: [
            "Lake Baikal is a lake located in the Siberian region of Russia, which has a continental climate"
        ]
    },
    {
        query: "The Great Barrier Reef is a coral reef system in the Pacific Ocean with high biodiversity",
        expected_nl: [
            "Reef_System"
        ],
        proof_nl: [
            "The Great Barrier Reef is a coral reef located in the Pacific Ocean with exceptional biodiversity"
        ]
    },
    {
        query: "English is spoken in the United States with millions of speakers",
        expected_nl: [
            "Language_Distribution"
        ],
        proof_nl: [
            "English is a language spoken in the United States with a large number of speakers"
        ]
    },
    {
        query: "Saudi Arabia has abundant oil reserves as a natural resource",
        expected_nl: [
            "Resource_Distribution"
        ],
        proof_nl: [
            "Saudi Arabia is a country that has oil as a resource with high abundance"
        ]
    },
    {
        query: "The Ring of Fire has frequent earthquakes due to tectonic plate boundaries",
        expected_nl: [
            "Earthquake_Zone",
            "Tectonic_Plate"
        ],
        proof_nl: [
            "The Ring of Fire is a region at the boundary of the Pacific tectonic plate with high earthquake frequency",
            "The Pacific Plate underlies certain continents and has specific boundary types"
        ]
    },
    {
        query: "Antarctica is covered by massive ice sheets",
        expected_nl: [
            "Ice_Sheet"
        ],
        proof_nl: [
            "The Antarctic ice sheet covers the continent of Antarctica with a vast area"
        ]
    },
    {
        query: "The Panama Canal connects the Pacific Ocean to the Atlantic Ocean",
        expected_nl: [
            "Canal_System"
        ],
        proof_nl: [
            "The Panama Canal is located in Panama and connects to the Atlantic Ocean"
        ]
    },
    {
        query: "Tokyo is a major metropolitan area with a large population",
        expected_nl: [
            "Metropolitan_Area"
        ],
        proof_nl: [
            "The Tokyo metropolitan area is centered on the city of Tokyo with a large population"
        ]
    },
    {
        query: "The Ganges River is sacred to Hinduism in India",
        expected_nl: [
            "River_System",
            "Sacred_Site"
        ],
        proof_nl: [
            "The Ganges is a river system with tributaries and a delta",
            "The Ganges River is sacred to Hinduism and has great religious importance"
        ]
    },
    {
        query: "California experiences earthquakes along the San Andreas Fault",
        expected_nl: [
            "Earthquake_Zone",
            "Transform_Fault"
        ],
        proof_nl: [
            "California is a region at the tectonic plate boundary with high earthquake frequency",
            "The San Andreas Fault is a transform fault connecting two tectonic plates"
        ]
    },
    {
        query: "Norway has many fjords formed by glacial activity",
        expected_nl: [
            "Fjord_Geography"
        ],
        proof_nl: [
            "Norwegian fjords are coastal features formed by glacial carving"
        ]
    },
    {
        query: "The Maldives is an atoll nation in the Indian Ocean",
        expected_nl: [
            "Atoll_Formation",
            "Island_Nation"
        ],
        proof_nl: [
            "Maldivian atolls are located in the Indian Ocean with lagoons",
            "The Maldives is an island nation surrounded by the Indian Ocean"
        ]
    },
    {
        query: "Wind farms in Denmark generate renewable energy",
        expected_nl: [
            "Wind_Farm"
        ],
        proof_nl: [
            "Danish wind farms are located in the region and have significant energy capacity"
        ]
    },
    {
        query: "The Serengeti has large populations of migrating wildebeest",
        expected_nl: [
            "Wildebeest_Migration",
            "Savanna_Distribution"
        ],
        proof_nl: [
            "The wildebeest migration occurs in the Serengeti savanna and crosses rivers during the journey",
            "The Serengeti is a savanna located in the African continent with a tropical grassland climate"
        ]
    },
    {
        query: "Yellowstone National Park has geysers and hot springs",
        expected_nl: [
            "Geyser_Field",
            "Hot_Spring",
            "National_Park"
        ],
        proof_nl: [
            "Yellowstone has geysers that erupt with specific frequency",
            "Yellowstone has hot springs with high temperatures",
            "Yellowstone National Park is located in the United States with a large protected area"
        ]
    },
    {
        query: "The Gulf Stream is a warm ocean current in the Atlantic",
        expected_nl: [
            "Warm_Current",
            "Ocean_Current"
        ],
        proof_nl: [
            "The Gulf Stream is a warm current flowing in the Atlantic Ocean with high temperature",
            "The Gulf Stream is an ocean current in the Atlantic with a specific direction"
        ]
    },
    {
        query: "Bangladesh experiences monsoons during the summer season",
        expected_nl: [
            "Monsoon_Pattern"
        ],
        proof_nl: [
            "Bangladesh is a region that has monsoon season with heavy rainfall during summer"
        ]
    },
    {
        query: "Iceland sits on the Mid-Atlantic Ridge with volcanic activity",
        expected_nl: [
            "Mid_Ocean_Ridge",
            "Volcano_Classification"
        ],
        proof_nl: [
            "The Mid-Atlantic Ridge is located in the Atlantic Ocean with volcanic activity",
            "Icelandic volcanoes are part of the Mid-Atlantic Ridge volcanic range with active status"
        ]
    },
    {
        query: "The Congo Rainforest has exceptional biodiversity",
        expected_nl: [
            "Rainforest_Biome",
            "Biodiversity_Hotspot"
        ],
        proof_nl: [
            "The Congo is a rainforest located in Central Africa with high annual rainfall",
            "The Congo Rainforest is a biodiversity hotspot in the Central African region with numerous species"
        ]
    },
    {
        query: "Dubai is a major port city with high trade volume",
        expected_nl: [
            "Port_System"
        ],
        proof_nl: [
            "Dubai's port is located on the coast with significant trade volume"
        ]
    },
    {
        query: "The Dead Sea is a salt lake with very high salinity",
        expected_nl: [
            "Salt_Lake"
        ],
        proof_nl: [
            "The Dead Sea is a salt lake located in the Middle East region with extremely high salinity"
        ]
    },
    {
        query: "Vatican City is an enclave within Italy",
        expected_nl: [
            "Enclave_Geography"
        ],
        proof_nl: [
            "Vatican City is an enclave that belongs to the Vatican but is surrounded by Italy"
        ]
    },
    {
        query: "The Tibetan Plateau is at high elevation in Asia",
        expected_nl: [
            "Plateau_Region"
        ],
        proof_nl: [
            "The Tibetan Plateau is located in the Asian continent at very high elevation"
        ]
    },
    {
        query: "Singapore has a major international airport hub",
        expected_nl: [
            "Airport_Hub"
        ],
        proof_nl: [
            "Singapore's airport serves the city of Singapore with excellent global connectivity"
        ]
    },
    {
        query: "The Mariana Trench is the deepest part of the Pacific Ocean",
        expected_nl: [
            "Trench_System"
        ],
        proof_nl: [
            "The Mariana Trench is an oceanic trench located in the Pacific Ocean with extreme depth"
        ]
    },
    {
        query: "Chernobyl was the site of a nuclear facility disaster",
        expected_nl: [
            "Nuclear_Facility"
        ],
        proof_nl: [
            "Chernobyl nuclear facility is located in Ukraine and had a power generation purpose before the disaster"
        ]
    },
    {
        query: "The Napa Valley produces wine grapes due to its Mediterranean climate",
        expected_nl: [
            "Agricultural_Zone",
            "Mediterranean_Climate"
        ],
        proof_nl: [
            "Napa Valley is a region that produces wine grapes suitable for the Mediterranean climate",
            "Napa Valley has Mediterranean seasons with specific temperature patterns"
        ]
    },
    {
        query: "Penguins breed in large colonies on Antarctic islands",
        expected_nl: [
            "Penguin_Colony",
            "Polar_Region"
        ],
        proof_nl: [
            "Antarctic penguin colonies are located on islands with large populations",
            "Antarctica is a polar region at high latitude with extensive ice cover"
        ]
    },
    {
        query: "The Aral Sea has shrunk dramatically due to irrigation",
        expected_nl: [
            "Lake_Classification",
            "Irrigation_System"
        ],
        proof_nl: [
            "The Aral Sea is a lake located in Central Asia which has a continental climate",
            "Irrigation systems in the region serve agricultural areas and support cotton crops"
        ]
    },
    {
        query: "Coral bleaching threatens the Great Barrier Reef due to rising temperatures",
        expected_nl: [
            "Coral_Bleaching",
            "Reef_System"
        ],
        proof_nl: [
            "Coral bleaching affects the Great Barrier Reef caused by increasing ocean temperature",
            "The Great Barrier Reef is a coral reef in the Pacific Ocean with high biodiversity"
        ]
    },
    {
        query: "The Amazon River basin drains a vast area of South America",
        expected_nl: [
            "Basin_Geography",
            "Drainage_Basin"
        ],
        proof_nl: [
            "The Amazon Basin is drained by the Amazon River with an enormous drainage area",
            "The Amazon drainage basin is located in Brazil and other countries with a massive total area"
        ]
    },
    {
        query: "El Nino events in the Pacific Ocean impact global weather",
        expected_nl: [
            "El_Nino_Event"
        ],
        proof_nl: [
            "El Nino events occur in the Pacific Ocean with significant global climate impact"
        ]
    },
    {
        query: "The Andes Mountains contain active volcanoes along the Pacific Ring of Fire",
        expected_nl: [
            "Mountain_Range",
            "Volcano_Classification"
        ],
        proof_nl: [
            "The Andes is a mountain range with peaks and adjacent valleys",
            "Andean volcanoes are part of mountain ranges with active eruption status"
        ]
    },
    {
        query: "Mangrove forests protect tropical coastlines from erosion",
        expected_nl: [
            "Mangrove_Forest",
            "Coastal_Reserve"
        ],
        proof_nl: [
            "Mangrove forests are located on tropical coasts with unique ecosystems",
            "Coastal reserves protect mangrove coasts with important ecosystems"
        ]
    },
    {
        query: "The European Union uses the Euro as a common currency",
        expected_nl: [
            "Currency_Zone"
        ],
        proof_nl: [
            "The Eurozone includes multiple European countries that use the Euro currency"
        ]
    },
    {
        query: "Tigers are endangered and live in forest reserves in Asia",
        expected_nl: [
            "Tiger_Reserve",
            "Endangered_Species"
        ],
        proof_nl: [
            "Tiger reserves protect forests in Asia and maintain tiger populations",
            "Tigers are endangered species living in forest habitats with threatened conservation status"
        ]
    },
    {
        query: "The Suez Canal connects the Mediterranean Sea to the Red Sea",
        expected_nl: [
            "Canal_System"
        ],
        proof_nl: [
            "The Suez Canal is located in Egypt and connects to the Red Sea"
        ]
    },
    {
        query: "Permafrost in Siberia is thawing due to climate change",
        expected_nl: [
            "Permafrost_Zone",
            "Polar_Region"
        ],
        proof_nl: [
            "Siberian permafrost zones are located in the region with significant depth",
            "Siberia is a polar region at high northern latitude with ice cover that is now melting"
        ]
    },
    {
        query: "The Rhine River flows through multiple European countries",
        expected_nl: [
            "River_System"
        ],
        proof_nl: [
            "The Rhine is a river system with tributaries and forms a delta where it meets the sea"
        ]
    },
    {
        query: "Hawaii is a volcanic archipelago in the Pacific Ocean",
        expected_nl: [
            "Archipelago_System",
            "Volcano_Classification"
        ],
        proof_nl: [
            "The Hawaiian archipelago is located in the Pacific Ocean with multiple islands",
            "Hawaiian volcanoes are part of volcanic ranges with varying active status"
        ]
    },
    {
        query: "The Galapagos Islands have many endemic species",
        expected_nl: [
            "Endemic_Species",
            "Island_Classification"
        ],
        proof_nl: [
            "Galapagos endemic species are found only on these islands with unique characteristics",
            "The Galapagos Islands are located in the Pacific Ocean with a specific size classification"
        ]
    },
    {
        query: "Venice is threatened by sea level rise",
        expected_nl: [
            "Sea_Level_Rise"
        ],
        proof_nl: [
            "Sea level rise in the Adriatic affects Venice at a measurable rate"
        ]
    }
];
