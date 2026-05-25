// AI deck templates — แก้ไข seals/mystics ได้ตามต้องการ
// seals: [{id, count}]  count ต้องไม่เกิน copy limit (lv1-2→4, lv3→3, lv4+→2)
// mystics: [{id, count}]  count ไม่เกิน 2

const AI_DECK_TEMPLATES = {

  zadin: {
    name: "Zadin",
    element: "fire",
    // fire seals: Firat(1) Infernos(6) VolcanicMinotaur(8) DesertChimera(7)
    //             MorMercenary(57) EvilFireWarrior(62) BlazeSage(74)
    //             Phoenix(78) ZadomsRider(87) GoldenFurGriffin(79) Salamandera(83)
    //             Zadin(91) NerimoPrincess(92)
    seals: [
      {id:1,  count:4},
      {id:6,  count:4},
      {id:8,  count:4},

      {id:57, count:4},
      {id:62, count:3},
      {id:78, count:3},
      {id:87, count:2},
      {id:83, count:2},
         {id:91, count:3},
            {id:92, count:3},
    ],
    mystics: [
      {id:17, count:2},{id:18, count:2},{id:19, count:2},{id:21, count:2},
      {id:24, count:2},{id:25, count:2},{id:26, count:2},{id:27, count:2},
      {id:29, count:2},{id:30, count:2}
    ]
  },

  andre: {
    name: "Andre",
    element: "water",
    // water seals: Magamouth(13) CoyCrab(14) GhostShip(16) MysteriousElephant(42)
    //              Siren(58) Armadillon(15) HydraOfWarok(50) VioriaFrigidWitch(56)
    //              AlbinoGryption(75)
    seals: [
      {id:13, count:4},
      {id:14, count:4},
      {id:84, count:3},
      {id:42, count:4},
      {id:90, count:3},
      {id:93, count:3},
      {id:15, count:4},
      {id:15, count:3},
      {id:56, count:2}
    ],
    mystics: [
      {id:17, count:2},{id:18, count:2},{id:19, count:2},{id:21, count:2},
      {id:24, count:2},{id:25, count:2},{id:26, count:2},{id:27, count:2},
      {id:29, count:2},{id:30, count:2}
    ]
  },

  sigmund: {
    name: "Sigmund",
    element: "wind",
    // wind seals: Delta-D(22) Akim(23) Banshee(28)
    //             GaleGaruda(53) BlueWindGriffin(59) FelasiaDragon(60)
    //             Thunderia(64) WoolWyvern(80)
    seals: [
      {id:22, count:4},
      {id:23, count:4},
      {id:76, count:3},
      {id:53, count:4},
      {id:89, count:3},
            {id:94, count:3},
      {id:60, count:4},
      {id:64, count:3},
      {id:80, count:3}
    ],
    mystics: [
      {id:17, count:2},{id:18, count:2},{id:19, count:2},{id:21, count:2},
      {id:24, count:2},{id:25, count:2},{id:26, count:2},{id:27, count:2},
      {id:29, count:2},{id:30, count:2}
    ]
  },

  harison: {
    name: "Harison",
    element: "earth",
    // earth seals: Scalo(10) Cockatrice(11) JiuWeiHuLe(12)
    //              CentaurRanger(9) StoneLizard(43) CentaurScout(52)
    //              Sphinx(65) PythonKerebanda(73)
    seals: [
      {id:10, count:4},
      {id:11, count:4},
      {id:88, count:3},
        {id:48, count:3},
              {id:95, count:3},
      {id:9,  count:4},
      {id:43, count:4},
      {id:52, count:4},
      {id:65, count:4},
      {id:73, count:2}
    ],
    mystics: [
      {id:17, count:2},{id:18, count:2},{id:19, count:2},{id:21, count:2},
      {id:24, count:2},{id:25, count:2},{id:26, count:2},{id:27, count:2},
      {id:29, count:2},{id:30, count:2}
    ]
  }

};
