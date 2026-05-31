const CARDS_METADATA = {
  "set_name": "Dividing of 4 Kingdoms",
  "set_code": "DFK",
  "total_in_set": 95,
  "cards": [
    {
      "id": 1,
      "name": "Firat",
      "path": "OGcarddbseal/card_1.jpg",
      "lv": 1,
      "at": 4,
      "df": 4,
      "spd": 4,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "fire"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Blaze Tail",
          "atk_at": 7,
          "atk_df": null,
          "atk_mp": 1,
          "atk_all": false
        },
        {
          "reqs": ["Firat","Firat"],
          "atk_name": "Flame Flock",
          "atk_at": 12,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "1/95",
      "illustrator": "Poripol Rakboonyuang",
      "ability_text": ""
    },
    {
      "id": 2,
      "name": "Golden Horn Unicorn",
      "path": "OGcarddbseal/card_2.jpg",
      "lv": 1,
      "at": 5,
      "df": 6,
      "spd": 3,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "light"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["light"],
          "atk_name": "Holy Horn",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- รักษา Curse ทุกชนิดให้กับ Seal 1 ใบ (Mp 1)"
      ],
      "collector_number": "2/95",
      "illustrator": "Poripol Rakboonyuang",
      "ability_text": ""
    },
    {
      "id": 3,
      "name": "Fairy Music Box",
      "path": "OGcarddbseal/card_3.jpg",
      "lv": 1,
      "at": 3,
      "df": 5,
      "spd": 0,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "light"
      ],
      "tribe": [
        "Machine"
      ],
      "fusions": [
        {
          "reqs": ["light"],
          "atk_name": "Melodies of Light",
          "atk_at": 7,
          "atk_df": null,
          "atk_mp": 1,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- นำ [Dark] 1 ใบในสนามเข้ากองการ์ด จากนั้นสลับกองการ์ดนั้น (Mp 2)",
        "[Skill]- นำ [Dark] และ/หรือ [Evil] 1 ใบในสนามเข้ากองการ์ด จากนั้นสลับกองการ์ดนั้น เมื่อ Fairy Music Box รวมร่าง (Mp 2)"
      ],
      "collector_number": "3/95",
      "illustrator": "Sopon Pinsarai",
      "ability_text": ""
    },
    {
      "id": 4,
      "name": "White Werewolf",
      "path": "OGcarddbseal/card_4.jpg",
      "lv": 1,
      "at": 5,
      "df": 6,
      "spd": 3,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "darkness"
      ],
      "tribe": [
        "Evil"
      ],
      "fusions": [
        {
          "reqs": ["darkness"],
          "atk_name": "Rough Roar",
          "atk_at": 7,
          "atk_df": null,
          "atk_mp": 1,
          "atk_all": false
        },
        {
          "reqs": ["darkness", "darkness"],
          "atk_name": "Fury Fang",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "4/95",
      "illustrator": "Poripol Rakboonyuang",
      "ability_text": [
        "ผลของ Mystic Card ประเภท [Tarot]: The Moon ที่ติดบน White Werewolf ให้ผล 2 เท่า"
      ]
    },
    {
      "id": 5,
      "name": "Punishula",
      "path": "OGcarddbseal/card_5.jpg",
      "lv": 1,
      "at": 4,
      "df": 7,
      "spd": 2,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "light"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["light"],
          "atk_name": "Tall Lashes",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["light", "light"],
          "atk_name": "Sacred Horn",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- ทำลาย [Evil] 1 ใบในสนาม (At Line) (Mp 3)"
      ],
      "collector_number": "5/95",
      "illustrator": "Poripol Rakboonyuang",
      "ability_text": ""
    },
    {
      "id": 6,
      "name": "Infernos",
      "path": "OGcarddbseal/card_6.jpg",
      "lv": 1,
      "at": 5,
      "df": 5,
      "spd": 3,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "fire"
      ],
      "tribe": [
        "Evil"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Scythe Lashes",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["darkness"],
          "atk_name": "Power Bern",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบที่มี Sp 3, 4, 5 ติด Last Dance Curse At +2 / 2 Turn เมื่อ Infernos รวมร่างกับ [Dark] (At Line) (Mp 2)"
      ],
      "collector_number": "6/95",
      "illustrator": "Pongtham Nantapan",
      "ability_text": ""
    },
    {
      "id": 7,
      "name": "Desert Chimera",
      "path": "OGcarddbseal/card_7.jpg",
      "lv": 2,
      "at": 7,
      "df": 8,
      "spd": 3,
      "mp_deploy": 3,
      "mp_attack": 1,
      "element": [
        "fire"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Fire Claw",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["fire", "fire"],
          "atk_name": "Desert Venom",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบที่มี Sp 3, 4, 5 ติด Poison Curse 3 Turn เมื่อ Desert Chimara รวมร่างกับ [Dark] (At Line) (Mp 2)"
      ],
      "collector_number": "7/95",
      "illustrator": "Pongtham Nantapan",
      "ability_text": ""
    },
    {
      "id": 8,
      "name": "Volcanic Minotaur",
      "path": "OGcarddbseal/card_8.jpg",
      "lv": 1,
      "at": 4,
      "df": 5,
      "spd": 2,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "fire"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Burning Horn",
          "atk_at": 7,
          "atk_df": null,
          "atk_mp": 1,
          "atk_all": false
        },
        {
          "reqs": ["fire", "fire"],
          "atk_name": "Fire Gore",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "8/95",
      "illustrator": "Pongtham Nantapan",
      "ability_text": [
        "เมื่อ Volcanic Minotaur ตก Shrine จากสนาม Seal ทุกใบในสนามฝ่ายตรงข้ามแยกการรวมร่าง"
      ]
    },
    {
      "id": 9,
      "name": "Centaur Ranger",
      "path": "OGcarddbseal/card_9.jpg",
      "lv": 2,
      "at": 7,
      "df": 8,
      "spd": 4,
      "mp_deploy": 3,
      "mp_attack": 1,
      "element": [
        "earth"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["earth"],
          "atk_name": "Rushing Stub",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["earth", "earth"],
          "atk_name": "Meteoric Pierce",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": null,
      "ability_text": [
        "ขณะที่ Centaur Ranger ต่อสู้กับ Seal ที่มี Sp น้อยกว่า Centaur Ranger Centaur Ranger At +2"
      ]
    },
    {
      "id": 10,
      "name": "Scalo",
      "path": "OGcarddbseal/card_10.jpg",
      "lv": 1,
      "at": 3,
      "df": 6,
      "spd": 1,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "earth"
      ],
      "tribe": [
        "Insect"
      ],
      "fusions": [
        {
          "reqs": ["earth"],
          "atk_name": "Roller",
          "atk_at": null,
          "atk_df": 9,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["earth", "earth"],
          "atk_name": "Fasten Roller",
          "atk_at": null,
          "atk_df": 11,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "10/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "เมื่อ Scalo โจมตี Seal ที่รวมร่าง เราสามารถใช้ Df ของ Scalo เทียบกับค่าพลังของ Seal ที่ถูกโจมตี",
        "Scalo สามารถโจมตีจาก Df Line ได้"
      ]
    },
    {
      "id": 11,
      "name": "Cockatrice",
      "path": "OGcarddbseal/card_11.jpg",
      "lv": 1,
      "at": 4,
      "df": 6,
      "spd": 1,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "earth"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["earth"],
          "atk_name": "Dry Glow",
          "atk_at": 7,
          "atk_df": null,
          "atk_mp": 1,
          "atk_all": false
        },
        {
          "reqs": ["earth", "earth"],
          "atk_name": "Spur Stub",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบที่มี Sp 1, 2, 3, 4 ติด Stone Curse 1 Turn เมื่อ Cockatrice รวมร่าง (Mp 2)"
      ],
      "collector_number": "11/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 12,
      "name": "Jiu Wei Hu Le",
      "path": "OGcarddbseal/card_12.jpg",
      "lv": 1,
      "at": 5,
      "df": 6,
      "spd": 3,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "earth"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["earth"],
          "atk_name": "Maya Indulge",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["darkness"],
          "atk_name": "Blow Claw",
          "atk_at": null,
          "atk_df": 7,
          "atk_mp": 1,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบที่มี Sp 1, 2, 3 ติด Charm Curse 3 Turn เมื่อ Jiu Wei Hu Le รวมร่างกับ [Dark] (Mp 2)"
      ],
      "collector_number": "12/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 13,
      "name": "Magamouth",
      "path": "OGcarddbseal/card_13.jpg",
      "lv": 1,
      "at": 5,
      "df": 6,
      "spd": 3,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "water"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["water"],
          "atk_name": "Sharp Canine",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["water", "water"],
          "atk_name": "Acute Assault",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "13/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "ขณะที่ Magamouth ต่อสู้กับ Seal ที่รวมร่าง Magamouth Df +1"
      ]
    },
    {
      "id": 14,
      "name": "Coy Crab",
      "path": "OGcarddbseal/card_14.jpg",
      "lv": 1,
      "at": 3,
      "df": 5,
      "spd": 2,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "water"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["water"],
          "atk_name": "Hide In Shell",
          "atk_at": null,
          "atk_df": 8,
          "atk_mp": 1,
          "atk_all": false
        },
        {
          "reqs": ["water", "water"],
          "atk_name": "Sharp Shell",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "14/95",
      "illustrator": "Menai Rakhboonyuang",
      "ability_text": [
        "ตราบเท่าที่มี Coy Crab ตั้งแต่ 2 ใบขึ้นไปในสนามฝ่ายเรา Seal ทุกใบในสนามฝ่ายตรงข้าม Sp = 0"
      ]
    },
    {
      "id": 15,
      "name": "Armadillon",
      "path": "OGcarddbseal/card_15.jpg",
      "lv": 2,
      "at": 7,
      "df": 9,
      "spd": 2,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "water"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["water"],
          "atk_name": "Ice Scale",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 1,
          "atk_all": false
        },
        {
          "reqs": ["water", "water"],
          "atk_name": "Ice Dorsal",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบที่มี Sp 2, 3, 4 ติด Freeze Curse 1 Turn เมื่อ Armadillon รวมร่าง (At Line) (Mp 2)"
      ],
      "collector_number": "15/95",
      "illustrator": "Pongtham Nantapan",
      "ability_text": ""
    },
    {
      "id": 16,
      "name": "Ghost Ship",
      "path": "OGcarddbseal/card_16.jpg",
      "lv": 1,
      "at": 6,
      "df": 8,
      "spd": 2,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "water"
      ],
      "tribe": [
        "Evil"
      ],
      "fusions": [
        {
          "reqs": ["water","water"],
          "atk_name": "Artillery",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["any"],
          "atk_name": "Vehicle",
          "atk_at": 7,
          "atk_df": null,
          "atk_mp": 1,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- นำ Ghost Ship กลับเข้ากองการ์ด จากนั้นสลับกองการ์ดนั้น เมื่อ Ghost Ship อยู่ในท่า Double Combination (Mp 0)"
      ],
      "collector_number": "16/95",
      "illustrator": "Pongtham Nantapan",
      "ability_text": ""
    },
    {
      "id": 20,
      "name": "Angel of Sword, the Revelation",
      "path": "OGcarddbseal/card_20.jpg",
      "lv": 2,
      "at": 6,
      "df": 8,
      "spd": 4,
      "mp_deploy": 3,
      "mp_attack": 1,
      "element": [
        "light"
      ],
      "tribe": [
        "Divine"
      ],
      "fusions": [
        {
          "reqs": ["light"],
          "atk_name": "Sword of Order",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["light", "light"],
          "atk_name": "Sword of Law",
          "atk_at": 9,
          "atk_df": null,
          "atk_sp": 5,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": [
       "[Skill]- นำ Angel of Sword, the Revelation ขึ้นมือจากสนาม (Mp 3)"
      ],
      "collector_number": "20/95",
      "illustrator": "Kasaemsun Boorijongruk",
      "ability_text": ["เมื่อ Angel of Sword, the Revelation เข้ามาในสนาม เราดู Mystic ทุกใบในมือฝ่ายตรงข้าม","Angel of Sword, the Revelation ยกเลิก Curse"]
    },
    {
      "id": 22,
      "name": "Delta-D",
      "path": "OGcarddbseal/card_22.jpg",
      "lv": 1,
      "at": 4,
      "df": 5,
      "spd": 3,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "wind"
      ],
      "tribe": [
        "Machine"
      ],
      "fusions": [
        {
          "reqs": ["light"],
          "atk_name": "Flash Ray",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["fire"],
          "atk_name": "Burning Beam",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- ผู้เล่น 1 คนจั่วการ์ด 1 ใบ (Df Line) (Mp 3)"
      ],
      "collector_number": "22/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ["Delta-D ยกเลิก Curse",
        "Delta-D ยกเลิก Mystic Card"]
    },
    {
      "id": 23,
      "name": "Akim",
      "path": "OGcarddbseal/card_23.jpg",
      "lv": 1,
      "at": 5,
      "df": 6,
      "spd": 4,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "wind"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["wind"],
          "atk_name": "Sand Storm",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["wind", "wind"],
          "atk_name": "Whirl Wind",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "23/95",
      "illustrator": "Pongtham Nantapan",
      "ability_text": [
        "ตราบเท่าที่ Akim รวมร่าง Seal ทุกใบในสนามฝ่ายเรา Sp = 4"
      ]
    },
    {
      "id": 28,
      "name": "Banshee",
      "path": "OGcarddbseal/card_28.jpg",
      "lv": 1,
      "at": 3,
      "df": 4,
      "spd": 3,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "wind"
      ],
      "tribe": [
        "Evil"
      ],
      "fusions": [
        {
          "reqs": ["wind"],
          "atk_name": "Scare Song",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["darkness"],
          "atk_name": "Death Song",
          "atk_at": 6,
          "atk_df": null,
          "atk_mp": 1,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบที่มี Sp 1, 2, 3 ติด Death Curse เมื่อ Benshee รวมร่างกับ [Dark] (At Line) (Mp 3)"
      ],
      "collector_number": "28/95",
      "illustrator": "Poripol Rakboonyuang",
      "ability_text": ""
    },
    {
      "id": 41,
      "name": "Black Wiser",
      "path": "OGcarddbseal/card_41.jpg",
      "lv": 2,
      "at": 6,
      "df": 7,
      "spd": 3,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "darkness"
      ],
      "tribe": [
        "Mage"
      ],
      "fusions": [
        {
          "reqs": ["darkness"],
          "atk_name": "Dark Purpose",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["Hellish Bird"],
          "atk_name": "Dark Damn ( )",
          "atk_at": 7,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": true
        }
      ],
      "skill_text": [
        "[Skill]- ผู้เล่นฝ่ายตรงข้าม 1 คน Mp -1 Interfere (Mp 2)",
        "[Skill]- ผู้เล่นฝ่ายตรงข้าม 1 คน Mp -2 เมื่อ Black Wiser รวมร่างกับ Hellish Bird Interfere (Mp 3)"
      ],
      "ability_text": null
    },
    {
      "id": 42,
      "name": "Mysterious Elephant",
      "path": "OGcarddbseal/card_42.jpg",
      "lv": 1,
      "at": 5,
      "df": 7,
      "spd": 3,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "water"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["water"],
          "atk_name": "Venom Ivory",
          "atk_at": 7,
          "atk_df": null,
          "atk_mp": 1,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบที่มี Sp 2, 3, 4, 5 ติด Poison Curse 1 Turn เมื่อ Mysterious Elephant รวมร่าง (At Line) (Mp 3)"
      ],
      "collector_number": "42/95",
      "illustrator": "Pongtham Nantapan",
      "ability_text": [
        "ผู้เล่นไม่สามารถสั่ง Seal ที่รวมร่างโจมตี Mysterious Elephant ได้"
      ]
    },
    {
      "id": 43,
      "name": "Stone Lizard",
      "path": "OGcarddbseal/card_43.jpg",
      "lv": 2,
      "at": 5,
      "df": 7,
      "spd": 2,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "earth"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["earth"],
          "atk_name": "Rock Arm",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["earth", "earth"],
          "atk_name": "Roll Attach",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "43/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "เมื่อ Stone Lizard โจมตีสำเร็จ Stone Lizard ติด Stone Curse จนจบ Subturn โจมตีต่อไปของเรา"
      ]
    },
    {
      "id": 44,
      "name": "Hellish Bird",
      "path": "OGcarddbseal/card_44.jpg",
      "lv": 1,
      "at": 6,
      "df": 6,
      "spd": 4,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "darkness"
      ],
      "tribe": [
        "Evil"
      ],
      "fusions": [
        {
          "reqs": ["darkness"],
          "atk_name": "Dark Dance",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["Black Wiser"],
          "atk_name": "End Energy",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบที่มี Sp 1, 2, 3, 4 ติด Last Dance Curse At +2 / 3 Turn เมื่อ Hellish Bird รวมร่างกับ [Dark] (At Line) (Mp 2)",
        "[Skill]- Seal 1 ใบที่มี Sp 1, 2, 3 ติด Last Dance Curse At +3 / 2 Turn เมื่อ Hellish Bird รวมร่างกับ Black Wiser (At Line) (Mp 3)"
      ],
      "ability_text": null
    },
    {
      "id": 45,
      "name": "Succubus",
      "path": "OGcarddbseal/card_45.jpg",
      "lv": 2,
      "at": 6,
      "df": 6,
      "spd": 3,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "darkness"
      ],
      "tribe": [
        "Evil"
      ],
      "fusions": [
        {
          "reqs": ["darkness"],
          "atk_name": "My Desire",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["darkness", "darkness"],
          "atk_name": "More Desire",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal ที่ไม่ใช่ [Light] 1 ใบที่มี Sp 1, 2, 3, 4, 5 ติด Charm Curse 1 Turn เมื่อ Succubus รวมร่าง (At Line) (Mp 2)"
      ],
      "ability_text": null
    },
    {
      "id": 46,
      "name": "Assassin Doll",
      "path": "OGcarddbseal/card_46.jpg",
      "lv": 1,
      "at": 3,
      "df": 4,
      "spd": 2,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "darkness"
      ],
      "tribe": [
        "Machine"
      ],
      "fusions": [
        {
          "reqs": ["darkness"],
          "atk_name": "Pretty Chop",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบฝ่ายตรงข้ามที่มี At น้อยที่สุด ติด Death Curse เมื่อมี Seal ตั้งแต่ 2 ใบขึ้นไปในสนามฝ่ายตรงข้าม (At Line) (Mp 2)"
      ],
      "collector_number": "46/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 47,
      "name": "Blue Wings Pegasus",
      "path": "OGcarddbseal/card_47.jpg",
      "lv": 2,
      "at": 5,
      "df": 7,
      "spd": 4,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "light"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["light"],
          "atk_name": "Flash Kick",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["light", "light"],
          "atk_name": "Soar Charge",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- นำ [Beast] 1 ใบเข้ามาในสนามจากมือเรา (Mp 2)"
      ],
      "collector_number": "47/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 48,
      "name": "Medusa",
      "path": "OGcarddbseal/card_48.jpg",
      "lv": 2,
      "at": 4,
      "df": 5,
      "spd": 2,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "earth"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["earth"],
          "atk_name": "Stone Sight",
          "atk_at": null,
          "atk_df": 6,
          "atk_mp": 1,
          "atk_all": false
        },
        {
          "reqs": ["water"],
          "atk_name": "Venom Hair",
          "atk_at": 7,
          "atk_df": null,
          "atk_mp": 1,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบที่มี Sp 1, 2, 3, 4 ติด Stone Curse Infinity Turn เมื่อ Medusa รวมร่างกับ [Earth] (Mp 3)",
        "[Skill]- Seal 1 ใบที่มี Sp 1, 2, 3 ติด Poison Curse 3 Turn เมื่อ Medusa รวมร่างกับ [Water] (Mp 2)"
      ],
      "ability_text": null
    },
    {
      "id": 49,
      "name": "Cerberus",
      "path": "OGcarddbseal/card_49.jpg",
      "lv": 2,
      "at": 7,
      "df": 8,
      "spd": 2,
      "mp_deploy": 3,
      "mp_attack": 2,
      "element": [
        "darkness"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["darkness","darkness"],
          "atk_name": "Black Bite",
        "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
       
        },
        {
          "reqs": ["fire"],
          "atk_name": "Fire Breath",
          "atk_at": 7,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false,
          "atk_hits": 3
        }
      ],
      "skill_text": "",
      "collector_number": "49/95",
      "illustrator": "",
      "ability_text": [
        "Cerberus สามารถโจมตี Seal ใบรองรวมร่างได้"
      ]
    },
    {
      "id": 50,
      "name": "Hydra of Warok",
      "path": "OGcarddbseal/card_50.jpg",
      "lv": 2,
      "at": 8,
      "df": 7,
      "spd": 2,
      "mp_deploy": 3,
      "mp_attack": 2,
      "element": [
        "water"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["darkness"],
          "atk_name": "Venom Fang",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["darkness", "water"],
          "atk_name": "Whirl Strike",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบที่มี Sp 3, 4, 5 ติด Poison Curse 2 Turn เมื่อ Hydra of Warok รวมร่าง (At Line) (Mp 2)"
      ],
      "collector_number": "50/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "ขณะที่ Hydra of Warok ต่อสู้กับ [Earth] Hydra of Warok At -3"
      ]
    },
    {
      "id": 51,
      "name": "Brigitte the Valkyrie",
      "path": "OGcarddbseal/card_51.jpg",
      "lv": 2,
      "at": 7,
      "df": 9,
      "spd": 3,
      "mp_deploy": 3,
      "mp_attack": 1,
      "element": [
        "light"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["light"],
          "atk_name": "Light Lance",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["light", "light"],
          "atk_name": "Rushing Lash",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "51/95",
      "illustrator": "Phenomenon Party",
      "ability_text": [
        "Seal ที่มี Sp น้อยกว่า Brigitte, the Valkyrie ไม่สามารถโจมตี Brigitte, the Valkyrie ได้"
      ]
    },
    {
      "id": 52,
      "name": "Centaur Scout",
      "path": "OGcarddbseal/card_52.jpg",
      "lv": 2,
      "at": 6,
      "df": 7,
      "spd": 4,
      "mp_deploy": 3,
      "mp_attack": 2,
      "element": [
        "earth"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["earth"],
          "atk_name": "Aim Arrow",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["earth", "earth"],
          "atk_name": "Zap Shot",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "52/95",
      "illustrator": "Poripol Rakboonyuang",
      "ability_text": [
        "ตราบเท่าที่ Centaur Scout อยู่ที่ At Line ต้องโจมตีข้ามไปยัง Seal ฝ่ายตรงข้ามที่อยู่ใน Df Line",
        "ตราบเท่าที่ Centaur Scout อยู่ที่ Df Line ต้องโจมตีข้ามไปยัง Seal ฝ่ายตรงข้ามที่อยู่ใน At Line"
      ]
    },
    {
      "id": 53,
      "name": "Gale Garuda",
      "path": "OGcarddbseal/card_53.jpg",
      "lv": 2,
      "at": 8,
      "df": 7,
      "spd": 5,
      "mp_deploy": 3,
      "mp_attack": 2,
      "element": [
        "wind"
      ],
      "tribe": [
        "Monster"
      ],
      "fusions": [
        {
          "reqs": ["wind"],
          "atk_name": "Soar Slash",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["wind", "wind"],
          "atk_name": "Soar Strike",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": ["[Skill]- เมื่อผู้เล่นฝ่ายตรงข้ามสั่ง Seal รวมร่าง นำ Gale Garuda เข้ามาที่ At Line จากมือ จากนั้นสั่ง Gale Garuda โจมตี Seal ที่กำลังรวมร่าง Interfere (Mp 4)"],
      "collector_number": "53/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 54,
      "name": "Titania",
      "path": "OGcarddbseal/card_54.jpg",
      "lv": 2,
      "at": 6,
      "df": 7,
      "spd": 3,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "light"
      ],
      "tribe": [
        "Divine"
      ],
      "fusions": [
        {
          "reqs": ["light"],
          "atk_name": "Aura Disposal",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["light", "light"],
          "atk_name": "Aura Barrier",
          "atk_at": null,
          "atk_df": 11,
          "atk_mp": 1,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- ทำลาย Mystic Card 1 ใบในสนาม เมื่อ Titania รวมร่างกับ [Light] (Mp 2)"
      ],
      "collector_number": "54/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 55,
      "name": "Black Night Griffin",
      "path": "OGcarddbseal/card_55.jpg",
      "lv": 2,
      "at": 7,
      "df": 8,
      "spd": 3,
      "mp_deploy": 3,
      "mp_attack": 1,
      "element": [
        "darkness"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["darkness"],
          "atk_name": "Shadow Scratch",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["wind"],
          "atk_name": "Misty Wing",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": null,
      "ability_text": [
        "[Beast] ใบอื่นทุกใบในสนามฝ่ายเรา At +1"
      ]
    },
    {
      "id": 56,
      "name": "Vioria the Frigid Witch",
      "path": "OGcarddbseal/card_56.jpg",
      "lv": 2,
      "at": 6,
      "df": 7,
      "spd": 3,
      "mp_deploy": 3,
      "mp_attack": 1,
      "element": [
        "water"
      ],
      "tribe": [
        "Mage"
      ],
      "fusions": [
        {
          "reqs": ["water"],
          "atk_name": "Iceblink",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["water", "water"],
          "atk_name": "Frigidity",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "56/95",
      "illustrator": "Nutt Punkabutz",
      "ability_text": [
        "เมื่อเข้าสู่ Mp Clean Up Step ของฝ่ายตรงข้าม เรา +Mp ตาม Mp ที่เหลือของฝ่ายตรงข้าม(ถ้ามี Vioria, the Frigid Witch ตั้งแต่ 2 ใบขึ้นไปในสนามฝ่ายเราให้เลือก Ability นี้ทำงานได้เพียง 1 ใบเท่านั้น)"
      ]
    },
    {
      "id": 57,
      "name": "Mor Mercenary",
      "path": "OGcarddbseal/card_57.jpg",
      "lv": 2,
      "at": 6,
      "df": 6,
      "spd": 3,
      "mp_deploy": 2,
      "mp_attack": 2,
      "element": [
        "fire"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Close Thrust",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["fire", "fire"],
          "atk_name": "Assassin Stab",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "57/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "เมื่อ Mor Mercenary โจมตี เราสามารถเลือกให้ Mor Mercenary เทียบค่าพลังของ Mor Mercenary กับ At หรือ Df ของ Seal ที่ถูกโจมตี"
      ]
    },
    {
      "id": 58,
      "name": "Siren",
      "path": "OGcarddbseal/card_58.jpg",
      "lv": 1,
      "at": 4,
      "df": 5,
      "spd": 3,
      "mp_deploy": 1,
      "mp_attack": 1,
      "element": [
        "water"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["darkness"],
          "atk_name": "Enchanting Song",
          "atk_at": 6,
          "atk_df": null,
          "atk_mp": 1,
          "atk_all": false
        },
        {
          "reqs": ["water", "water"],
          "atk_name": "Sonic Wave",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบที่มี Sp 3, 4, 5 ติด Charm Curse 2 Turn เมื่อ Siren รวมร่างกับ [Dark] (At Line) (Mp 2)"
      ],
      "ability_text": null
    },
    {
      "id": 59,
      "name": "Blue Wind Griffin",
      "path": "OGcarddbseal/card_59.jpg",
      "lv": 2,
      "at": 7,
      "df": 8,
      "spd": 4,
      "mp_deploy": 3,
      "mp_attack": 1,
      "element": [
        "wind"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["wind"],
          "atk_name": "Cyanic Feather",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["wind", "wind"],
          "atk_name": "Blow Beak",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบในสนาม Sp +1 จนจบ Subturn Interfere (Mp 2)"
      ],
      "collector_number": "59/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "[Beast] ใบอื่นทุกใบในสนามฝ่ายเรา Sp +1"
      ]
    },
    {
      "id": 60,
      "name": "Felasia Dragon",
      "path": "OGcarddbseal/card_60.jpg",
      "lv": 2,
      "at": 8,
      "df": 7,
      "spd": 3,
      "mp_deploy": 3,
      "mp_attack": 2,
      "element": [
        "wind"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["wind"],
          "atk_name": "Lance Assault",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["Dragon"],
          "atk_name": "Double Assault",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- สั่ง Felasia Dragoon โจมตี 2 ครั้ง ★ ครั้งที่ 1 At = 9 ★ ครั้งที่ 2 At ปกติของ [Dragon] ที่เป็น Seal ใบรองรวมร่างของ Felasia Dragoon เมื่อ Felasia Dragoon รวมร่างกับ [Dragon] (At Line) (Mp 3)"
      ],
      "collector_number": "60/95",
      "illustrator": "Pongtham Nantapan",
      "ability_text": []
    },
    {
      "id": 62,
      "name": "Evil Fire Warrior",
      "path": "OGcarddbseal/card_62.jpg",
      "lv": 2,
      "at": 6,
      "df": 8,
      "spd": 3,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "fire"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Cruel Fire Die Sword",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "62/95",
      "illustrator": "Britana Eaimchan",
      "ability_text": [
        "ตราบเท่าที่ Seal ในสนามฝ่ายตรงข้ามมากกว่าเรา Evil Fire Warrior At +3",
        "ตราบเท่าที่ Seal ในสนามฝ่ายตรงข้ามน้อยกว่าเรา Evil Fire Warrior At -3"
      ]
    },
    {
      "id": 63,
      "name": "Dread Knight",
      "path": "OGcarddbseal/card_63.jpg",
      "lv": 2,
      "at": 8,
      "df": 0,
      "spd": 3,
      "mp_deploy": 3,
      "mp_attack": 3,
      "element": [
        "darkness"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["darkness"],
          "atk_name": "Frenzied Cleave",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "63/95",
      "illustrator": "Pongtham Nantapan",
      "ability_text": [
        "Dread Knight สามารถโจมตีข้ามไปยัง Df Line ได้",
        "ผู้เล่นไม่สามารถกำหนด Line ให้ Dread Knight อยู่ที่ Df Line ได้"
      ]
    },
    {
      "id": 64,
      "name": "Thunderix",
      "path": "OGcarddbseal/card_64.jpg",
      "lv": 2,
      "at": 6,
      "df": 7,
      "spd": 5,
      "mp_deploy": 3,
      "mp_attack": 1,
      "element": [
        "wind"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["wind"],
          "atk_name": "Thunder Tail",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["wind", "wind"],
          "atk_name": "Electric Crest",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "64/95",
      "illustrator": "Poripol Rakboonyuang",
      "ability_text": [
        "ตราบเท่าที่ Thunderix รวมร่าง [Beast] ที่ไม่ได้รวมร่างทุกใบในสนาม นับว่าอยู่ในสภาพ Double Combination"
      ]
    },
    {
      "id": 65,
      "name": "Sphinx",
      "path": "OGcarddbseal/card_65.jpg",
      "lv": 2,
      "at": 5,
      "df": 7,
      "spd": 3,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "earth"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["earth"],
          "atk_name": "Sand Scratch",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["light"],
          "atk_name": "Riddle",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- ผู้เล่นทุกคนนำ Seal และ Mystic Card ทั้งหมดในสนามเข้ากองการ์ดแล้วสลับกองการ์ดนั้น จากนั้นผู้เล่นทุกคนนำ Seal ทุกใบเข้ามาในสนามจากมือ เมื่อ Sphinx รวมร่างกับ [Light] (At Line) (Mp 4)"
      ],
      "collector_number": "65/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 67,
      "name": "Gregory the Bishop",
      "path": "OGcarddbseal/card_67.jpg",
      "lv": 2,
      "at": 7,
      "df": 8,
      "spd": 2,
      "mp_deploy": 3,
      "mp_attack": 1,
      "element": [
        "light"
      ],
      "tribe": [
        "Mage"
      ],
      "fusions": [
        {
          "reqs": ["light"],
          "atk_name": "Holy Words",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["light", "light"],
          "atk_name": "Halo Radiant",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "67/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "Seal ทุกใบในสนามฝ่ายเรายกเลิก Mystic Card (At Line)"
      ]
    },
    {
      "id": 72,
      "name": "Dark Destiny",
      "path": "OGcarddbseal/card_72.jpg",
      "lv": 1,
      "at": 5,
      "df": 5,
      "spd": 5,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "darkness"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["darkness"],
          "atk_name": "Shadow Sharp",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "72/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "เมื่อ Dark Destiny เข้ามาในสนาม เราสามารถนำ Mystic Card 1 ใบใน Shrine เราขึ้นมือ",
        "เมื่อ Dark Destiny ตก Shrine เราต้องทิ้ง Mystic Card 1 ใบในมือเรา"
      ]
    },
    {
      "id": 73,
      "name": "Python, Kerebanda's Guardian",
      "path": "OGcarddbseal/card_73.jpg",
      "lv": 2,
      "at": 7,
      "df": 10,
      "spd": 2,
      "mp_deploy": 4,
      "mp_attack": 1,
      "element": [
        "earth"
      ],
      "tribe": [
        "Dragon"
      ],
      "fusions": [
        {
          "reqs": ["earth"],
          "atk_name": "Guardian Anger",
          "atk_at": 10,
          "atk_df": 11,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["earth", "earth"],
          "atk_name": "Brow Breaker",
          "atk_at": 11,
          "atk_df": 12,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "73/95",
      "illustrator": "Pongtham Nantapan",
      "ability_text": [
        "เมื่อ Python, Kerebanda's Guardian ถูกโจมตี เทียบ Df ของ Python, Kerebanda's Guardian กับค่าพลังของ Seal ที่โจมตี Python, Kerebanda's Guardian จนออกจากการโจมตีนั้น",
        "ขณะที่ Python, Kerebanda's Guardian ต่อสู้กับ [Wind] Python, Kerebanda's Guardian At -3"
      ]
    },
    {
      "id": 74,
      "name": "Blaze Sage, the Viceroy of Zalom",
      "path": "OGcarddbseal/card_74.jpg",
      "lv": 2,
      "at": 6,
      "df": 6,
      "spd": 3,
      "mp_deploy": 3,
      "mp_attack": 1,
      "element": [
        "fire"
      ],
      "tribe": [
        "Mage"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Glowing Fire",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["fire", "fire"],
          "atk_name": "Burning Blaze",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Sacrifice Seal 1 ใบ; Seal 1 ใบ +At ตาม Mp ค่าร่ายของ Seal ที่ถูก Sacrifice 1 Turn (Mp 2)"
      ],
      "collector_number": "74/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 75,
      "name": "Albino Gryption",
      "path": "OGcarddbseal/card_75.jpg",
      "lv": 2,
      "at": 6,
      "df": 7,
      "spd": 4,
      "mp_deploy": 3,
      "mp_attack": 1,
      "element": [
        "water"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["water"],
          "atk_name": "White Wing",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["Beast"],
          "atk_name": "Wild Beak",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "75/95",
      "illustrator": "Poripol Rakboonyuang",
      "ability_text": [
        "[Beast] ทุกใบในมือเรา Mp ค่าร่าย -1 (Ability นี้จะไม่ทำงานถ้ามี Albino Gryphon ตั้งแต่ 2 ใบขึ้นไปในสนาม)"
      ]
    },
    {
      "id": 76,
      "name": "Thor Thunder God",
      "path": "OGcarddbseal/card_76.jpg",
      "lv": 4,
      "at": 10,
      "df": 10,
      "spd": 5,
      "mp_deploy": 5,
      "mp_attack": 3,
      "element": [
        "wind"
      ],
      "tribe": [
        "Divine"
      ],
      "fusions": [
        {
          "reqs": ["wind"],
          "atk_name": "Bolt Hammer",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["wind", "wind"],
          "atk_name": "Shock Smash",
          "atk_at": 13,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "76/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "ตราบเท่าที่ฝ่ายตรงข้ามมี Seal ที่ At Line นำ Thor, the Thunder God ในสนาม ไปที่ At Line เสมอ"
      ]
    },
    {
      "id": 77,
      "name": "Yggdrasil",
      "path": "OGcarddbseal/card_77.jpg",
      "lv": 3,
      "at": 3,
      "df": 12,
      "spd": 0,
      "mp_deploy": 5,
      "mp_attack": 1,
      "element": [
        "earth"
      ],
      "tribe": [
        "Divine"
      ],
      "fusions": [
        {
          "reqs": ["light"],
          "atk_name": "Leaf of Life",
          "atk_at": null,
          "atk_df": 3,
          "atk_mp": 1,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- นำ Seal 1 ใบใน Shrine เราขึ้นมือ เมื่อ Yggdrasil รวมร่าง (Mp 3)"
      ],
      "collector_number": "77/95",
      "illustrator": "Britana Eaimchan",
      "ability_text": [
        "Seal ที่อยู่ข้าง Yggdrasil Df =11 Sp =0 (Df Line)"
      ]
    },
    {
      "id": 78,
      "name": "Phoenix",
      "path": "OGcarddbseal/card_78.jpg",
      "lv": 2,
      "at": 5,
      "df": 5,
      "spd": 4,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "fire"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Fire Wing",
          "atk_at": 8,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["fire", "fire"],
          "atk_name": "Rising Sun",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- นำ Phoenix เข้ามาในสนามจาก Shrine เรา Interfere (Mp 2) (Skill นี้สามารถถูกสั่งการได้ แม้ Phoenix อยู่ใน Shrine และ Skill นี้ถูกสั่งการได้ 1 ครั้งใน 1 เกม)"
      ],
      "collector_number": "78/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 79,
      "name": "Golden Fur Griffin",
      "path": "OGcarddbseal/card_79.jpg",
      "lv": 3,
      "at": 7,
      "df": 8,
      "spd": 3,
      "mp_deploy": 3,
      "mp_attack": 2,
      "element": [
        "fire"
      ],
      "tribe": [
        "Beast"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Fire Wing Cutter",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "79/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "Golden Fur Griffin +At และ -Df ตามจำนวน [Beast] ใบอื่นในสนามฝ่ายเรา"
      ]
    },
    {
      "id": 80,
      "name": "Wool Wyvern",
      "path": "OGcarddbseal/card_80.jpg",
      "lv": 2,
      "at": 8,
      "df": 9,
      "spd": 5,
      "mp_deploy": 4,
      "mp_attack": 2,
      "element": [
        "wind"
      ],
      "tribe": [
        "Dragon"
      ],
      "fusions": [
        {
          "reqs": ["wind"],
          "atk_name": "Wave Wing",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["Dragon"],
          "atk_name": "Soar Charge",
          "atk_at": 12,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- นำ Wool Wyvern เข้ามาในสนามจากมือ Interfere (Mp 4)"
      ],
      "collector_number": "80/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "ขณะที่ Wool Wyvern ต่อสู้กับ [Fire] Wool Wyvern At -2"
      ]
    },
    {
      "id": 81,
      "name": "Undine",
      "path": "OGcarddbseal/card_81.jpg",
      "lv": 2,
      "at": 7,
      "df": 8,
      "spd": 4,
      "mp_deploy": 4,
      "mp_attack": 1,
      "element": [
        "water"
      ],
      "tribe": [
        "Divine"
      ],
      "fusions": [
        {
          "reqs": ["water"],
          "atk_name": "Silent Lake",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        },
        {
          "reqs": ["water", "water"],
          "atk_name": "Wave Lashes",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "81/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "Seal ใบอื่นทุกใบในสนามฝ่ายเรา At +1 Df +2"
      ]
    },
    {
      "id": 82,
      "name": "Heaven Knight",
      "path": "OGcarddbseal/card_82.jpg",
      "lv": 4,
      "at": 10,
      "df": 11,
      "spd": 5,
      "mp_deploy": 5,
      "mp_attack": 3,
      "element": [
        "light"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["light", "light"],
          "atk_name": "Holy Light",
          "atk_at": 12,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        },
        {
          "reqs": ["wind"],
          "atk_name": "Holy War",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 5,
          "atk_all": true
        }
      ],
      "skill_text": "",
      "collector_number": "82/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "เมื่อ Heaven Knight อยู่ในสนาม ครบ 3 Turn นำ Heaven Knight เข้ากองการ์ดจากนั้นสลับกองการ์ดนั้น",
        "Heaven Knight ยกเลิก Curse ของผู้เล่นทุกคนและ Mystic Card ฝ่ายตรงข้าม"
      ]
    },
    {
      "id": 83,
      "name": "Salamandera",
      "path": "OGcarddbseal/card_83.jpg",
      "lv": 3,
      "at": 8,
      "df": 9,
      "spd": 3,
      "mp_deploy": 4,
      "mp_attack": 2,
      "element": [
        "fire"
      ],
      "tribe": [
        "Dragon"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Dragon Fire",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["fire", "fire"],
          "atk_name": "Blaze Breath",
          "atk_at": 12,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "83/95",
      "illustrator": "Pongtham Nantapan",
      "ability_text": [
        "Salamandara +At ตามจำนวน Seal ที่อยู่ใน At Line ฝ่ายเรา",
        "Salamandara -At ตามจำนวน Seal ที่อยู่ใน At Line ฝ่ายตรงข้าม"
      ]
    },
    {
      "id": 84,
      "name": "Jormungand",
      "path": "OGcarddbseal/card_84.jpg",
      "lv": 3,
      "at": 10,
      "df": 11,
      "spd": 2,
      "mp_deploy": 5,
      "mp_attack": 3,
      "element": [
        "water"
      ],
      "tribe": [
        "Dragon"
      ],
      "fusions": [
        {
          "reqs": ["water"],
          "atk_name": "Freeze Breath",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["water", "water"],
          "atk_name": "Tidal Wave",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 5,
          "atk_all": true
        }
      ],
      "skill_text": [
        "[Skill]- Freeze Curse (All) 1 Turn เมื่อ Jormungand รวมร่างกับ [Water] (At Line) (Mp 4)"
      ],
      "collector_number": "84/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "ขณะที่ Jormungand ต่อสู้กับ [Earth] Jormungand At -3"
      ]
    },
    {
      "id": 85,
      "name": "Tiamat Black Dragon",
      "path": "OGcarddbseal/card_85.jpg",
      "lv": 3,
      "at": 9,
      "df": 10,
      "spd": 2,
      "mp_deploy": 5,
      "mp_attack": 2,
      "element": [
        "darkness"
      ],
      "tribe": [
        "Dragon"
      ],
      "fusions": [
        {
          "reqs": ["darkness"],
          "atk_name": "Dark Fang",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["darkness", "darkness"],
          "atk_name": "Acid Breath",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- ทิ้ง Seal 1 ใบในมือเรา; Tiamat, the Black Dragon + At ตาม Lv ของ Seal ใบนั้น 1 Turn Interfere (Mp 2)"
      ],
      "collector_number": "85/95",
      "illustrator": "Panon R. & Pongtham N.",
      "ability_text": [
        "ขณะที่ Tiamat, the Black Dragon ต่อสู้กับ [Light] Tiamat, the Black Dragon At -3"
      ]
    },
    {
      "id": 86,
      "name": "Divine Dragon",
      "path": "OGcarddbseal/card_86.jpg",
      "lv": 3,
      "at": 7,
      "df": 9,
      "spd": 3,
      "mp_deploy": 5,
      "mp_attack": 2,
      "element": [
        "light"
      ],
      "tribe": [
        "Dragon"
      ],
      "fusions": [
        {
          "reqs": ["light"],
          "atk_name": "Albino Flame",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["light", "light"],
          "atk_name": "Aurora Beam",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": "",
      "collector_number": "86/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "Divine Dragon +At ตามจำนวน Seal ในสนามฝ่ายตรงข้าม",
        "ขณะที่ Divine Dragon ต่อสู้กับ [Knight] Divine Dragon At -2"
      ]
    },
    {
      "id": 87,
      "name": "Zalom's Rider",
      "path": "OGcarddbseal/card_87.jpg",
      "lv": 2,
      "at": 6,
      "df": 6,
      "spd": 3,
      "mp_deploy": 2,
      "mp_attack": 1,
      "element": [
        "fire"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Golden Spear",
          "atk_at": 9,
          "atk_df": null,
          "atk_mp": 2,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- Seal 1 ใบ At +1 จนจบ Subturn (Mp 1)"
      ],
      "collector_number": "87/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 88,
      "name": "Harison, Knight of Pentacles",
      "path": "OGcarddbseal/card_88.jpg",
      "lv": 3,
      "at": 8,
      "df": 11,
      "spd": 3,
      "mp_deploy": 4,
      "mp_attack": 2,
      "element": [
        "earth"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["earth"],
          "atk_name": "Geo Fist",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["earth", "earth"],
          "atk_name": "Geo Meditation",
          "atk_at": 11,
          "atk_df": 13,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- ทำลาย Seal ที่ติด Stone Curse 1 ใบ (At Line) (Mp 3)"
      ],
      "ability_text": null
    },
    {
      "id": 89,
      "name": "Sigmund 3rd, Knight of Swords",
      "path": "OGcarddbseal/card_89.jpg",
      "lv": 3,
      "at": 9,
      "df": 10,
      "spd": 4,
      "mp_deploy": 4,
      "mp_attack": 3,
      "element": [
        "wind"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["Beast"],
          "atk_name": "Flash Slash",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["wind", "wind"],
          "atk_name": "Felasia Sword",
          "atk_at": 12,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": null,
      "ability_text": [
        "เมื่อ Sigmund 3rd, Knight of Swords โจมตี Seal ที่มี Sp น้อยกว่า Sigmund 3rd, Knight of Swords Seal ที่ถูกโจมตี Df -2 จนออกจากการโจมตีนั้น"
      ]
    },
    {
      "id": 90,
      "name": "Andre, Knight of Cups",
      "path": "OGcarddbseal/card_90.jpg",
      "lv": 3,
      "at": 9,
      "df": 10,
      "spd": 4,
      "mp_deploy": 4,
      "mp_attack": 3,
      "element": [
        "water"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["water"],
          "atk_name": "Crystal Cleave",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["water", "water"],
          "atk_name": "Iced Blade",
          "atk_at": 12,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        }
      ],
      "skill_text": null,
      "ability_text": [
        "เมื่อ Andre, Knight of Cups เข้ามาในสนาม นำ Seal ทุกใบในสนามที่มี Sp น้อยกว่า Andre, Knight of Cups ไปที่ Df Line (ผลจาก Ability นี้ไม่นับว่าเป็นการกำหนด Line)"
      ]
    },
    {
      "id": 91,
      "name": "Zadin, Knight of Wands",
      "path": "OGcarddbseal/card_91.jpg",
      "lv": 4,
      "at": 10,
      "df": 10,
      "spd": 3,
      "mp_deploy": 5,
      "mp_attack": 3,
      "element": [
        "fire"
      ],
      "tribe": [
        "Knight"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Flame Hit",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["Dragon"],
          "atk_name": "Twice Thwack",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["fire", "fire"],
          "atk_name": "Magmata Smash",
          "atk_at": 12,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        }
      ],
      "skill_text": [
        "[Skill]- สั่ง Zadin, Knight of Wands โจมตี 2 ครั้งด้วย At = 8 ไปยัง Seal ที่อยู่ใน At Line หรือ Df Line ฝ่ายตรงข้าม เมื่อ Zadin, Knight of Wands รวมร่างกับ [Dragon] (At Line) (Mp 4)"
      ],
      "ability_text": null
    },
    {
      "id": 92,
      "name": "Nerimor Princess Wands",
      "path": "OGcarddbseal/card_92.jpg",
      "lv": 3,
      "at": 9,
      "df": 9,
      "spd": 4,
      "mp_deploy": 4,
      "mp_attack": 3,
      "element": [
        "fire"
      ],
      "tribe": [
        "Mage"
      ],
      "fusions": [
        {
          "reqs": ["fire"],
          "atk_name": "Furious Flame",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["fire", "fire"],
          "atk_name": "Burn Ruination",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 5,
          "atk_all": true
        }
      ],
      "skill_text": "",
      "collector_number": "92/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": [
        "[Fire] ทุกใบในสนามฝ่ายเรา At +1 Df -3 (Df Line)"
      ]
    },
    {
      "id": 93,
      "name": "Alana Princess Cups",
      "path": "OGcarddbseal/card_93.jpg",
      "lv": 3,
      "at": 9,
      "df": 10,
      "spd": 3,
      "mp_deploy": 4,
      "mp_attack": 2,
      "element": [
        "water"
      ],
      "tribe": [
        "Mage"
      ],
      "fusions": [
        {
          "reqs": ["water"],
          "atk_name": "Diamond Mist",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["water", "water"],
          "atk_name": "Snowstorm",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 5,
          "atk_all": true
        }
      ],
      "skill_text": [
        "[Skill]- นำ Seal ที่ติด Freeze Curse 1 ใบขึ้นมือ (At Line) (Mp 1)"
      ],
      "collector_number": "93/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 94,
      "name": "Regina Princess Swords",
      "path": "OGcarddbseal/card_94.jpg",
      "lv": 3,
      "at": 9,
      "df": 9,
      "spd": 5,
      "mp_deploy": 4,
      "mp_attack": 3,
      "element": [
        "wind"
      ],
      "tribe": [
        "Mage"
      ],
      "fusions": [
        {
          "reqs": ["wind"],
          "atk_name": "Dancing Sword",
          "atk_at": 11,
          "atk_df": null,
          "atk_mp": 4,
          "atk_all": false
        },
        {
          "reqs": ["wind", "wind"],
          "atk_name": "Million Slash",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 5,
          "atk_all": true
        }
      ],
      "skill_text": [
        "[Skill]- ผู้เล่นทุกคนนำ Seal ทุกใบในสนามฝ่ายตนไปที่ At Line เมื่อ Regina, Princess of Swords รวมร่างกับ [Wind] (At Line) (Mp 1) (ผลจาก Skill นี้ไม่นับว่าเป็นการกำหนด Line)"
      ],
      "collector_number": "94/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    },
    {
      "id": 95,
      "name": "Wanaan Princess Pentacles",
      "path": "OGcarddbseal/card_95.jpg",
      "lv": 3,
      "at": 8,
      "df": 12,
      "spd": 3,
      "mp_deploy": 4,
      "mp_attack": 2,
      "element": [
        "earth"
      ],
      "tribe": [
        "Mage"
      ],
      "fusions": [
        {
          "reqs": ["earth"],
          "atk_name": "Voice of Earth",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 3,
          "atk_all": false
        },
        {
          "reqs": ["earth", "earth"],
          "atk_name": "Cry of Earth",
          "atk_at": 10,
          "atk_df": null,
          "atk_mp": 5,
          "atk_all": true
        }
      ],
      "skill_text": [
        "[Skill]- Seal ใบอื่น 1 ใบ +Df ตาม Mp ค่าร่ายของ Seal นั้นจนจบ Subturn Interfere (Mp 2)"
      ],
      "collector_number": "95/95",
      "illustrator": "Panon Rattanasungh",
      "ability_text": ""
    }
  ]
};