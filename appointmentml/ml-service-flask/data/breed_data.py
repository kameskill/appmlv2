"""
Dog breed characteristics dataset for ML-based haircut recommendations.
Features: coat_type, coat_length, size, shedding, season_sensitivity
"""

BREED_DATA = {
    "Labrador Retriever": {
        "coat_type": "double",
        "coat_length": "short",
        "size": "large",
        "shedding": "high",
        "season_sensitivity": "high",
        "waterproof": True
    },
    "Golden Retriever": {
        "coat_type": "double",
        "coat_length": "long",
        "size": "large",
        "shedding": "high",
        "season_sensitivity": "high",
        "waterproof": True
    },
    "German Shepherd": {
        "coat_type": "double",
        "coat_length": "medium",
        "size": "large",
        "shedding": "high",
        "season_sensitivity": "high",
        "waterproof": True
    },
    "Bulldog": {
        "coat_type": "single",
        "coat_length": "short",
        "size": "medium",
        "shedding": "low",
        "season_sensitivity": "low",
        "waterproof": False
    },
    "Poodle": {
        "coat_type": "curly",
        "coat_length": "long",
        "size": "medium",
        "shedding": "low",
        "season_sensitivity": "medium",
        "waterproof": False
    },
    "Beagle": {
        "coat_type": "single",
        "coat_length": "short",
        "size": "medium",
        "shedding": "medium",
        "season_sensitivity": "low",
        "waterproof": False
    },
    "Yorkshire Terrier": {
        "coat_type": "silky",
        "coat_length": "long",
        "size": "small",
        "shedding": "low",
        "season_sensitivity": "medium",
        "waterproof": False
    },
    "Dachshund": {
        "coat_type": "single",
        "coat_length": "short",
        "size": "small",
        "shedding": "low",
        "season_sensitivity": "low",
        "waterproof": False
    },
    "Shih Tzu": {
        "coat_type": "silky",
        "coat_length": "long",
        "size": "small",
        "shedding": "low",
        "season_sensitivity": "medium",
        "waterproof": False
    },
    "Maltese": {
        "coat_type": "silky",
        "coat_length": "long",
        "size": "small",
        "shedding": "low",
        "season_sensitivity": "medium",
        "waterproof": False
    },
    "Chihuahua": {
        "coat_type": "single",
        "coat_length": "short",
        "size": "small",
        "shedding": "low",
        "season_sensitivity": "high",
        "waterproof": False
    },
    "Pomeranian": {
        "coat_type": "double",
        "coat_length": "long",
        "size": "small",
        "shedding": "medium",
        "season_sensitivity": "high",
        "waterproof": False
    },
    "Other": {
        "coat_type": "single",
        "coat_length": "medium",
        "size": "medium",
        "shedding": "medium",
        "season_sensitivity": "medium",
        "waterproof": False
    }
}

# Haircut catalog: name, description, price, suitable_for (coat types / sizes), avoid_seasons
HAIRCUT_CATALOG = [
    {
        "name": "Puppy Cut",
        "description": "A classic, low-maintenance style with uniform length (1-2 inches) all over the body — keeps your dog looking adorable year-round.",
        "price": "₱800",
        "suitable_coat": ["curly", "silky", "single"],
        "suitable_size": ["small", "medium"],
        "best_seasons": ["spring", "summer", "fall", "winter"],
        "avoid_seasons": [],
        "base_score": 0.85
    },
    {
        "name": "Teddy Bear Cut",
        "description": "Rounded face and body trimmed to a soft, fluffy finish — gives your dog an irresistibly cuddly appearance with a round head shape.",
        "price": "₱800",
        "suitable_coat": ["curly", "silky", "double"],
        "suitable_size": ["small", "medium"],
        "best_seasons": ["fall", "winter", "spring"],
        "avoid_seasons": [],
        "base_score": 0.82
    },
    {
        "name": "Feathered Trim",
        "description": "Maintains the natural coat flow while trimming the feathering on legs, tail, and ears — enhances the natural beauty of sporting breeds.",
        "price": "₱1100",
        "suitable_coat": ["double", "silky"],
        "suitable_size": ["large", "medium"],
        "best_seasons": ["spring", "fall"],
        "avoid_seasons": ["summer"],
        "base_score": 0.80
    },
    {
        "name": "Lamb Cut",
        "description": "Soft, uniform length all over the body creating a lamb-like fluffy appearance — adorable and cuddly for curly-coated breeds.",
        "price": "₱800",
        "suitable_coat": ["curly"],
        "suitable_size": ["small", "medium", "large"],
        "best_seasons": ["winter", "fall", "spring"],
        "avoid_seasons": ["summer"],
        "base_score": 0.78
    },
    {
        "name": "Lion Cut",
        "description": "Full, fluffy mane around the head and chest while body is trimmed short — bold, regal look for dogs with thick coats.",
        "price": "₱1200",
        "suitable_coat": ["double", "curly", "silky"],
        "suitable_size": ["medium", "large"],
        "best_seasons": ["summer", "spring"],
        "avoid_seasons": ["winter"],
        "base_score": 0.72
    },
    {
        "name": "Summer Cut",
        "description": "Short all-over trim for hot weather — keeps your dog cool and comfortable during warm months with easy-to-maintain length.",
        "price": "₱750",
        "suitable_coat": ["double", "single", "silky", "curly"],
        "suitable_size": ["small", "medium", "large"],
        "best_seasons": ["summer"],
        "avoid_seasons": ["winter"],
        "base_score": 0.88
    },
    {
        "name": "Sanitary Trim",
        "description": "Focuses on hygiene-sensitive areas (paws, sanitary, ears) while maintaining overall coat length — practical and clean.",
        "price": "₱800",
        "suitable_coat": ["single", "double", "silky", "curly", "wire"],
        "suitable_size": ["small", "medium", "large"],
        "best_seasons": ["spring", "summer", "fall", "winter"],
        "avoid_seasons": [],
        "base_score": 0.75
    },
    {
        "name": "Show Cut",
        "description": "Breed-standard grooming following official show specifications — professional competition-ready styling for purebred dogs.",
        "price": "₱1500",
        "suitable_coat": ["curly", "silky", "double"],
        "suitable_size": ["small", "medium", "large"],
        "best_seasons": ["spring", "fall"],
        "avoid_seasons": [],
        "base_score": 0.65
    },
    {
        "name": "Bath & Brush Only",
        "description": "Gentle bath with premium shampoo and thorough blow-dry brushing — ideal for short-coated breeds that need minimal trimming.",
        "price": "₱600",
        "suitable_coat": ["single", "double"],
        "suitable_size": ["small", "medium", "large"],
        "best_seasons": ["spring", "summer", "fall", "winter"],
        "avoid_seasons": [],
        "base_score": 0.80
    },
    {
        "name": "De-shedding Treatment",
        "description": "Deep deshedding bath, high-velocity blow-dry, and undercoat removal treatment — significantly reduces shedding for double-coated breeds.",
        "price": "₱700",
        "suitable_coat": ["double"],
        "suitable_size": ["medium", "large"],
        "best_seasons": ["spring", "fall"],
        "avoid_seasons": [],
        "base_score": 0.90
    }
]
