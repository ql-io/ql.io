/*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var _    = require('underscore'),
    util = require('util'),
    http = require('http'),
    url = require('url');

var Engine = require('../lib/engine');

var engine = new Engine({
});




var maxNestedRequests = engine.config.maxNestedRequests || 50, limit = 1;

var cooked = {
    maxinclause : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload:
                    JSON.stringify(
                        [
                            {"title": "Golden Roman number Mens Luxury  automatic mechanical Watch Date&Day New"},
                            {"title": "HOT! Fashion Two Fingers Exquisite Clear Crystal Golden Peace Sign Double Rings"},
                            {"title": "Egyptian Papyrus Art Painting - Ramses II&Isis"},
                            {"title": "New Analytical Greek Lexicon by Wesley J. Perschbacher"},
                            {"title": "SET OF 8 CHINESE WOOD CARVED TEAPOT/SNUFF BOTTLES STAND"},
                            {"title": "4mm,5mm,6mm,7mm,8mm,12mm,20mm,Silver,Gold,Bronze,Black etc.Open Jump Rings T001"},
                            {"title": "10 Grams Gold Leaf Flake - Huge Beautiful Flakes - If Not Happy Return I"},
                            {"title": "Vintage Sailboat Glass Intaglio/Bubble Charm, gold toned border-9/16"},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "5pcs Lampwork Glass Black Beads Flower Fit Bracelet"},
                            {"title": "Green Jade Dragonfly Jewellery Necklace Pendant"},
                            {"title": "WW2 Japanese Officer Gunto Sword Spring Locking Clip"},
                            {"title": "M90 Tibet 108 god Buddha Prayer Mala BONE Bead necklace Meditation Jewelry"},
                            {"title": "4mm,5mm,6mm,7mm,8mm,12mm,20mm,Silver,Gold,Bronze,Black etc.Open Jump Rings T00"},
                            {"title": "Couture Ulla-Maija Courtney Wedding Dress"},
                            {"title": "SET OF 8 CHINESE WOOD CARVED TEAPOT/SNUFF BOTTLES STAND"},
                            {"title": "MINIATURE Hand PAINTED OIL PAINTING Landscape Vertical"},
                            {"title": "DRAGON KING - Beautiful OX BONE INRO&OJIME / Netsuke"},
                            {"title": "2-PC Full Tang Ninja Twin Bladed Sword K102014ABK"},
                            {"title": "FUSED GLASS SLUMPED PINK VASE"},
                            {"title": "NEW NATURAL 30X30 10 PK ULTRA SHINE RESIN RESTAURANT TABLE TOPS CHAIR FURNITURE"},
                            {"title": "DISCOUNT 2 LOT SOLID WOOD METAL HARDWARE BLACK CANVAS DIRECTORS CHAIR"},
                            {"title": "ANTIQUE ORNATE FLEMISH MECHELEN OAK DINING TABLE CARVED"},
                            {"title": "South Shore Axess Small Wood w/Hutch Chocolate Computer Desk"},
                            {"title": "nEw 5pc MLB LOS ANGELES DOGERS Comforter Bed Sheets - Baseball QUEEN BEDDING SET"},
                            {"title": "DISCOUNT 2 LOT SOLID WOOD METAL HARDWARE BLACK CANVAS DIRECTORS CHAIR"},
                            {"title": "NEW Aladdin (DVD, 2004, 2-Disc Set, Special Edition English/French/Spanish)"},
                            {"title": "Corner Sectional Sectionals Sofa Couch Free Ottoman 6 Colors Reversible Chaise"},
                            {"title": "Beautiful Ethan Allen Armoire"},
                            {"title": "J.K. Rishel Furniture Company ( vanity dresser )"},
                            {"title": "MONSTER HIGH BLACK&WHITE SKULL SHORES FRANKIE STEIN 2 to 3 DAY PRIORITY MAIL"},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "2 beer signs!!     Beer&Wine      Pilsner Lite Beer"},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "Adult Womens 50s Poodle Skirt Sock Hop Halloween Costume Large"},
                            {"title": "BASKET, 13 X 13 X 13 TO TOP OF HANDLE, HEAVY, BEAUTIFUL!..REDUCED!!"},
                            {"title": "NEW NATURAL 30X30 10 PK ULTRA SHINE RESIN RESTAURANT TABLE TOPS CHAIR FURNITURE"},
                            {"title": "With the Lights Out [Box] [CD&DVD] by Nirvana (US) (CD, Nov-2004, 3 Discs,..."},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "Kitty Kat Tea Pot"},
                            {"title": "Tiffany&CO. Pendant Heart Necklace"},
                            {"title": "5pcs2mm 925Sterling Silver snake chain Necklace 16-24"},
                            {"title": "Rogers Cymbal stand plus Pedal"},
                            {"title": "Motorola Adventure V750 - Silver black (Verizon) Cellular Phone"},
                            {"title": "1 GRAM .999 PURE SILVER BUFFALO/INDIAN COIN ROUND"},
                            {"title": "Enamelware Trays Two Vintage Cobalt Blue"},
                            {"title": "International 53 pc Satin Danford Flatware Set New Sets Flatware Tabletop Dining"},
                            {"title": "VINTAGE GORHAM STERLING SILVER SERVING LADLE GREENBRIAR"},
                            {"title": "1 GRAM .999 PURE SILVER BUFFALO/INDIAN COIN ROUND"}
                        ]
                    )
            }

        ],
        script: 'create table first on select get from "http://localhost:3000/"'+
                'using patch "test/patches/ebay.finding.items.js"'+
                'return select title from first where keywords in ("roman","ring","egyptian","greek","chinese","bronze","gold","intaglio","antique","glass","jade","japanese","buddha","bronze","ivory","chinese","painting","netsuke","sword","vase","table","chairs","oak","desk","bed","chair","french","sofa","armoire","dresser","doll","primitive","wood","sign","antique","halloween","basket","table","box","americana","tea","tiffany","sterling","rogers","silver","coin","tray","flatware","gorham","coin","door","stained","cast","iron","window","tile","victorian","shabby","light","garden","bronze","french","deco","lamp","crafts","vase","mirror","frame","antique","nouveau","atlas","globe","texas","italy","world","france","germany","maps","poland","map")',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error: ' + err.stack || err);
                    test.fail('got error ' + err);

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.ok(!_.isArray(result.body[0]), 'expected object in the array');
                    test.equals(result.body.length, maxNestedRequests * limit, 'expected a different number of results for in-clause');

                }
            }
        }
    },
    maxinfuncs : {
        ports: [
            {
                port: 3000,
                status: 200,
                type: "application",
                subType: "json",
                payload:
                    JSON.stringify(
                        [
                            {"title": "Golden Roman number Mens Luxury  automatic mechanical Watch Date&Day New"},
                            {"title": "HOT! Fashion Two Fingers Exquisite Clear Crystal Golden Peace Sign Double Rings"},
                            {"title": "Egyptian Papyrus Art Painting - Ramses II&Isis"},
                            {"title": "New Analytical Greek Lexicon by Wesley J. Perschbacher"},
                            {"title": "SET OF 8 CHINESE WOOD CARVED TEAPOT/SNUFF BOTTLES STAND"},
                            {"title": "4mm,5mm,6mm,7mm,8mm,12mm,20mm,Silver,Gold,Bronze,Black etc.Open Jump Rings T001"},
                            {"title": "10 Grams Gold Leaf Flake - Huge Beautiful Flakes - If Not Happy Return I"},
                            {"title": "Vintage Sailboat Glass Intaglio/Bubble Charm, gold toned border-9/16"},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "5pcs Lampwork Glass Black Beads Flower Fit Bracelet"},
                            {"title": "Green Jade Dragonfly Jewellery Necklace Pendant"},
                            {"title": "WW2 Japanese Officer Gunto Sword Spring Locking Clip"},
                            {"title": "M90 Tibet 108 god Buddha Prayer Mala BONE Bead necklace Meditation Jewelry"},
                            {"title": "4mm,5mm,6mm,7mm,8mm,12mm,20mm,Silver,Gold,Bronze,Black etc.Open Jump Rings T00"},
                            {"title": "Couture Ulla-Maija Courtney Wedding Dress"},
                            {"title": "SET OF 8 CHINESE WOOD CARVED TEAPOT/SNUFF BOTTLES STAND"},
                            {"title": "MINIATURE Hand PAINTED OIL PAINTING Landscape Vertical"},
                            {"title": "DRAGON KING - Beautiful OX BONE INRO&OJIME / Netsuke"},
                            {"title": "2-PC Full Tang Ninja Twin Bladed Sword K102014ABK"},
                            {"title": "FUSED GLASS SLUMPED PINK VASE"},
                            {"title": "NEW NATURAL 30X30 10 PK ULTRA SHINE RESIN RESTAURANT TABLE TOPS CHAIR FURNITURE"},
                            {"title": "DISCOUNT 2 LOT SOLID WOOD METAL HARDWARE BLACK CANVAS DIRECTORS CHAIR"},
                            {"title": "ANTIQUE ORNATE FLEMISH MECHELEN OAK DINING TABLE CARVED"},
                            {"title": "South Shore Axess Small Wood w/Hutch Chocolate Computer Desk"},
                            {"title": "nEw 5pc MLB LOS ANGELES DOGERS Comforter Bed Sheets - Baseball QUEEN BEDDING SET"},
                            {"title": "DISCOUNT 2 LOT SOLID WOOD METAL HARDWARE BLACK CANVAS DIRECTORS CHAIR"},
                            {"title": "NEW Aladdin (DVD, 2004, 2-Disc Set, Special Edition English/French/Spanish)"},
                            {"title": "Corner Sectional Sectionals Sofa Couch Free Ottoman 6 Colors Reversible Chaise"},
                            {"title": "Beautiful Ethan Allen Armoire"},
                            {"title": "J.K. Rishel Furniture Company ( vanity dresser )"},
                            {"title": "MONSTER HIGH BLACK&WHITE SKULL SHORES FRANKIE STEIN 2 to 3 DAY PRIORITY MAIL"},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "2 beer signs!!     Beer&Wine      Pilsner Lite Beer"},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "Adult Womens 50s Poodle Skirt Sock Hop Halloween Costume Large"},
                            {"title": "BASKET, 13 X 13 X 13 TO TOP OF HANDLE, HEAVY, BEAUTIFUL!..REDUCED!!"},
                            {"title": "NEW NATURAL 30X30 10 PK ULTRA SHINE RESIN RESTAURANT TABLE TOPS CHAIR FURNITURE"},
                            {"title": "With the Lights Out [Box] [CD&DVD] by Nirvana (US) (CD, Nov-2004, 3 Discs,..."},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "Kitty Kat Tea Pot"},
                            {"title": "Tiffany&CO. Pendant Heart Necklace"},
                            {"title": "5pcs2mm 925Sterling Silver snake chain Necklace 16-24"},
                            {"title": "Rogers Cymbal stand plus Pedal"},
                            {"title": "Motorola Adventure V750 - Silver black (Verizon) Cellular Phone"},
                            {"title": "1 GRAM .999 PURE SILVER BUFFALO/INDIAN COIN ROUND"},
                            {"title": "Enamelware Trays Two Vintage Cobalt Blue"},
                            {"title": "International 53 pc Satin Danford Flatware Set New Sets Flatware Tabletop Dining"},
                            {"title": "VINTAGE GORHAM STERLING SILVER SERVING LADLE GREENBRIAR"},
                            {"title": "1 GRAM .999 PURE SILVER BUFFALO/INDIAN COIN ROUND"}
                        ]
                    )
            },
            {
                port: 3026,
                status: 200,
                type: "application",
                subType: "json",
                payload:
                    JSON.stringify(
                        [
                            {"title": "Golden Roman number Mens Luxury  automatic mechanical Watch Date&Day New"},
                            {"title": "HOT! Fashion Two Fingers Exquisite Clear Crystal Golden Peace Sign Double Rings"},
                            {"title": "Egyptian Papyrus Art Painting - Ramses II&Isis"},
                            {"title": "New Analytical Greek Lexicon by Wesley J. Perschbacher"},
                            {"title": "SET OF 8 CHINESE WOOD CARVED TEAPOT/SNUFF BOTTLES STAND"},
                            {"title": "4mm,5mm,6mm,7mm,8mm,12mm,20mm,Silver,Gold,Bronze,Black etc.Open Jump Rings T001"},
                            {"title": "10 Grams Gold Leaf Flake - Huge Beautiful Flakes - If Not Happy Return I"},
                            {"title": "Vintage Sailboat Glass Intaglio/Bubble Charm, gold toned border-9/16"},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "5pcs Lampwork Glass Black Beads Flower Fit Bracelet"},
                            {"title": "Green Jade Dragonfly Jewellery Necklace Pendant"},
                            {"title": "WW2 Japanese Officer Gunto Sword Spring Locking Clip"},
                            {"title": "M90 Tibet 108 god Buddha Prayer Mala BONE Bead necklace Meditation Jewelry"},
                            {"title": "4mm,5mm,6mm,7mm,8mm,12mm,20mm,Silver,Gold,Bronze,Black etc.Open Jump Rings T00"},
                            {"title": "Couture Ulla-Maija Courtney Wedding Dress"},
                            {"title": "SET OF 8 CHINESE WOOD CARVED TEAPOT/SNUFF BOTTLES STAND"},
                            {"title": "MINIATURE Hand PAINTED OIL PAINTING Landscape Vertical"},
                            {"title": "DRAGON KING - Beautiful OX BONE INRO&OJIME / Netsuke"},
                            {"title": "2-PC Full Tang Ninja Twin Bladed Sword K102014ABK"},
                            {"title": "FUSED GLASS SLUMPED PINK VASE"},
                            {"title": "NEW NATURAL 30X30 10 PK ULTRA SHINE RESIN RESTAURANT TABLE TOPS CHAIR FURNITURE"},
                            {"title": "DISCOUNT 2 LOT SOLID WOOD METAL HARDWARE BLACK CANVAS DIRECTORS CHAIR"},
                            {"title": "ANTIQUE ORNATE FLEMISH MECHELEN OAK DINING TABLE CARVED"},
                            {"title": "South Shore Axess Small Wood w/Hutch Chocolate Computer Desk"},
                            {"title": "nEw 5pc MLB LOS ANGELES DOGERS Comforter Bed Sheets - Baseball QUEEN BEDDING SET"},
                            {"title": "DISCOUNT 2 LOT SOLID WOOD METAL HARDWARE BLACK CANVAS DIRECTORS CHAIR"},
                            {"title": "NEW Aladdin (DVD, 2004, 2-Disc Set, Special Edition English/French/Spanish)"},
                            {"title": "Corner Sectional Sectionals Sofa Couch Free Ottoman 6 Colors Reversible Chaise"},
                            {"title": "Beautiful Ethan Allen Armoire"},
                            {"title": "J.K. Rishel Furniture Company ( vanity dresser )"},
                            {"title": "MONSTER HIGH BLACK&WHITE SKULL SHORES FRANKIE STEIN 2 to 3 DAY PRIORITY MAIL"},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "2 beer signs!!     Beer&Wine      Pilsner Lite Beer"},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "Adult Womens 50s Poodle Skirt Sock Hop Halloween Costume Large"},
                            {"title": "BASKET, 13 X 13 X 13 TO TOP OF HANDLE, HEAVY, BEAUTIFUL!..REDUCED!!"},
                            {"title": "NEW NATURAL 30X30 10 PK ULTRA SHINE RESIN RESTAURANT TABLE TOPS CHAIR FURNITURE"},
                            {"title": "With the Lights Out [Box] [CD&DVD] by Nirvana (US) (CD, Nov-2004, 3 Discs,..."},
                            {"title": "Barn Wood Fence Decor. Country Primitive. Rustic Americana. Antique Farm."},
                            {"title": "Kitty Kat Tea Pot"},
                            {"title": "Tiffany&CO. Pendant Heart Necklace"},
                            {"title": "5pcs2mm 925Sterling Silver snake chain Necklace 16-24"},
                            {"title": "Rogers Cymbal stand plus Pedal"},
                            {"title": "Motorola Adventure V750 - Silver black (Verizon) Cellular Phone"},
                            {"title": "1 GRAM .999 PURE SILVER BUFFALO/INDIAN COIN ROUND"},
                            {"title": "Enamelware Trays Two Vintage Cobalt Blue"},
                            {"title": "International 53 pc Satin Danford Flatware Set New Sets Flatware Tabletop Dining"},
                            {"title": "VINTAGE GORHAM STERLING SILVER SERVING LADLE GREENBRIAR"},
                            {"title": "1 GRAM .999 PURE SILVER BUFFALO/INDIAN COIN ROUND"}
                        ]
                    )
            }

        ],
        script: 'create table first on select get from "http://localhost:3000/"'+
                'using patch "test/patches/ebay.finding.items.js"'+
                'create table second on select get from "http://localhost:3000/"'+
                'using patch "test/patches/ebay.finding.items.js"'+
                'return select b.title as Title, a.title as title from first as a, second as b where a.keywords = b.keywords and a.keywords in ("roman","ring","egyptian","greek","chinese","bronze","gold","intaglio","antique","glass","jade","japanese","buddha","bronze","ivory","chinese","painting","netsuke","sword","vase","table","chairs","oak","desk","bed","chair","french","sofa","armoire","dresser","doll","primitive","wood","sign","antique","halloween","basket","table","box","americana","tea","tiffany","sterling","rogers","silver","coin","tray","flatware","gorham","coin","door","stained","cast","iron","window","tile","victorian","shabby","light","garden","bronze","french","deco","lamp","crafts","vase","mirror","frame","antique","nouveau","atlas","globe","texas","italy","world","france","germany","maps","poland","map")',

        udf: {
            test : function (test, err, result) {
                if(err) {
                    test.fail('got error ' + err);

                }
                else {
                    test.equals(result.headers['content-type'], 'application/json', 'HTML expected');
                    test.ok(_.isArray(result.body), 'expected an array');
                    test.ok(result.body.length > 0, 'expected some items');
                    test.ok(!_.isArray(result.body[0]), 'expected object in the array');
                    test.equals(result.body.length, maxNestedRequests, 'expected a different number of results for funcs');

                }
            }
        }

    }

}

module.exports = require('ql-unit').init({
    cooked: cooked,
    engine:new Engine({

    })
});
