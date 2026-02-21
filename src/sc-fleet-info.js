
const VERSION = '2.0.7';

const RSI_HOST = 'https://robertsspaceindustries.com';
const RSI_PLEDGES = RSI_HOST + '/en/account/pledges';

const FLEETYARDS_HOST = 'https://fleetyards.net/ships/';

const RSI_DATA_CACHE_KEY = 'scfi_raw_rsi_pledge_data';
const RSI_DATA_CACHE_TTL = 600000;
const SETTINGS_CACHE_KEY = 'scfi_settings';

const PAINT_PARSING_FIXES = {
    'P-72': 'P72',
    'Archimedes Emerald Skin': 'Archimedes - Emerald Skin'
};

const PAINT_MATCHING__DONT_USE_SHORT_MATCH_NAME = [
    'hull',
    'sabre raven',
    'roc ds'
];

const PAINT_MATCHING__MATCH_NAME_TO_ALT = {
    'mercury': 'star runner',
    'grin roc ds': 'roc',
    '100i': '100 series',
    '125a': '100 series',
    '135c': '100 series',
    'a1': 'spirit',
    'c1': 'spirit',
    'e1': 'spirit',
    'a2': 'hercules',
    'c2': 'hercules',
    'm2': 'hercules',
    'c8r': 'c8 pisces',
    'c8x': 'c8 pisces',
    '600i exploration module': '600i explorer',
    'csvsm': 'csv',
    'a.t.l.s.': 'atls'
};

const FLEETYARDS_SHIP_NAME_FIXES = {
    'Hercules Starlifter A2': 'A2 Hercules',
    'Hercules Starlifter C2': 'C2 Hercules',
    'Hercules Starlifter M2': 'M2 Hercules',
    'F7CM Super Hornet': 'F7C-M Super Hornet',
    'GRIN ROC DS': 'ROC DS',
    'Genesis Starliner': 'GENESIS',
    'MPUV C': 'MPUV CARGO',
    '600i Exploration Module': '600i Explorer',
    '600i Touring Module': '600i Touring'
};

const TRANSLATIONS = {
    'group_ship': 'Vehicles',
    'group_equipment': 'Equipment',
    'group_decoration': 'Decorations',
    'group_weapon': 'Weapons',
    'type_ship': 'Vehicle',
    'type_equipment': 'Equipment',
    'type_decoration': 'Decoration',
    'type_weapon': 'Weapon'
};

const REPLACE_GROUP_NAME_WITH = {
    'insurance_months': 'insurance_short'
}

let object_id = 0;
let templates = {};
let raw_pledge_data = [];
let objects = [];
let cards = [];
let $root = null;

let settings = {
    group_by: 'type',
    show_types: ['ship'],
    hide_paints_in_virtual_ships: true,
    hide_upgrades_in_virtual_ships: false,
    hide_hangars: true
};

// HELPERS ---------------------------------------------------------------------------

function set_cache(key, data, ttl = null) {
    localStorage[key] = JSON.stringify(data);
    if (ttl) {
	    const now = new Date();
        localStorage[key + '__ttl'] = now.getTime() + ttl;
    }
}

function get_cache(key) {
    if (!localStorage[key]) {
        return null;
    }
	const now = new Date();
    if (localStorage[key + '__ttl'] && now.getTime() > localStorage[key + '__ttl']) {
        return null;
    }
    return JSON.parse(localStorage[key]);
}

// RSI RAW DATA EXTRACTION -----------------------------------------------------------

function cut(input) {
    input = input.replaceAll('\n', '');
    input = input.trim();
    return input;
};

function uncssbg(input) {
    input = input.replaceAll('url("', '');
    input = input.replaceAll('")', '');
    return input;
};

function get_pledge_link(number) {
    return RSI_PLEDGES + '?pagesize=1&page=' + number;
};

let pledge_number = 1;
function extract_raw_data_from_rsi_pledges(data = [], page = 1) {
    return new Promise(function(resolve, reject) {
        fetch_through_extension(RSI_PLEDGES + '?pagesize=10&page=' + page, {method: 'GET'}).then(function(response) {
            response.text().then(function(response_body) {
                let $body = $(response_body);

                if ($('.list-items .empy-list', $body).length > 0) {
                    resolve(data);
                    return;
                }

                $('.list-items li', $body).each(function(index, $pledge) {
                    let pledge_data = {};

                    pledge_data.number = pledge_number++;
                    pledge_data.link = get_pledge_link(pledge_data.number);
                    pledge_data.title = cut($('.title-col h3', $pledge).children().remove().end().text());
                    pledge_data.created_at = cut($('.date-col', $pledge).children().remove().end().text());
                    pledge_data.contains = cut($('.items-col', $pledge).children().remove().end().text());
                    pledge_data.value = $('.js-pledge-value', $pledge).attr('value');
                    pledge_data.items = [];

                    pledge_data.image = uncssbg($('div.image', $pledge).css('background-image'));
                    if (pledge_data.image.charAt(0) == '/') {
                        pledge_data.image = RSI_HOST + pledge_data.image;
                    }

                    $('.with-images .item', $pledge).each(function(i, $item) {
                        let item_data = {};

                        item_data.name = cut($('.title', $item).text());
                        item_data.extra = cut($('.liner', $item).text());
                        item_data.type = cut($('.kind', $item).text());

                        if ($('.image', $item).length !== 0) {
                            item_data.image = uncssbg($('.image', $item).css('background-image'));
                            if (item_data.image.charAt(0) == '/') {
                                item_data.image = RSI_HOST + item_data.image;
                            }
                        }

                        pledge_data.items.push(item_data);
                    });

                    $('.without-images .item', $pledge).each(function(i, $item) {
                        let item_data = {};
                        item_data.name = cut($('.title', $item).text());    
                        pledge_data.items.push(item_data);
                    });

                    data.push(pledge_data);
                });

                extract_raw_data_from_rsi_pledges(data, page + 1).then(function(data) {
                    resolve(data);
                });
            });
        });
    });
};


function fetch_through_extension(input, init) {
    return fetch(input, init);
};

//siis
function fetch_through_extension(input, init) {
    return new Promise(function(resolve, reject) {
        chrome.runtime.sendMessage({input, init}, messageResponse => {
            const [response, error] = messageResponse;
            if (response === null) {
                reject(error);
            } else {
                const body = response.body ? new Blob([response.body]) : undefined;
                resolve(new Response(body, {
                    status: response.status,
                    statusText: response.statusText,
                }));
            }
        });
    });
};
//siie

// OBJECT MAPPING --------------------------------------------------------------------

function get_virtual_ship(name) {
    let ship = {};
    ship.id = object_id++;
    ship.name = name;
    ship.name_normalized = name.toLowerCase();
    ship.manufacturer = 'unknown';
    ship.type = 'ship';
    ship.virtual = true;
    ship.linked = [];
    return ship;
};

function link_upgrades_to_ships(objects) {
    let upgrades = [];

    for (oid in objects) {
        let obj = objects[oid];
        if (obj.type == 'upgrade') {
            upgrades.push(obj);
        }
    }

    for (oid in objects) {
        let ship = objects[oid];
        if (ship.type != 'ship') continue;
        for (upgrade of upgrades) {
            if (upgrade.from.toLowerCase().includes(ship.name_normalized)) {
                ship.linked.push(upgrade);
                upgrade.linked.push(ship);
                upgrade.has_linked_ships = true;
            }
        }
    }

    let virtual_ships = {};

    for (upgrade of upgrades) {
        if (upgrade.has_linked_ships == true) {
            continue;        
        }

        let ship_name = upgrade.from;
        let ship = virtual_ships[ship_name];

        if (!ship) {
            ship = get_virtual_ship(ship_name);
            virtual_ships[ship_name] = ship;
            objects[ship.id] = ship;
        }

        ship.linked.push(upgrade);
        upgrade.linked.push(ship);
    }
}

function link_paints_to_ships(objects) {
    let paints = [];

    for (oid in objects) {
        let obj = objects[oid];
        if (obj.type == 'paint') {
            paints.push(obj);
        }
    }

    for (oid in objects) {
        let ship = objects[oid];
        if (ship.type != 'ship') continue;

        let name_split = ship.name_normalized.split(' ');
        let match_name = name_split[0].trim();
        
        for (match of PAINT_MATCHING__DONT_USE_SHORT_MATCH_NAME) {
            if (ship.name_normalized.includes(match)) {  
                match_name = ship.name_normalized;
                break;
            }
        }

        let alt_match_name = match_name;

        for (mn in PAINT_MATCHING__MATCH_NAME_TO_ALT) {
            if (ship.name_normalized.includes(mn)) {
                alt_match_name = PAINT_MATCHING__MATCH_NAME_TO_ALT[mn];
                break;
            }
        }

        for (paint of paints) {
            if (paint.for.toLowerCase().includes(match_name)
                || paint.for.toLowerCase().includes(alt_match_name)
            ) {
                ship.linked.push(paint);
                paint.linked.push(ship);
                paint.has_linked_ships = true;
            }
        }
    }

    let virtual_ships = {};

    for (paint of paints) {
        if (paint.has_linked_ships == true) {
            continue;        
        }

        let ship_name = paint.for;
        let ship = virtual_ships[ship_name];

        if (!ship) {
            ship = get_virtual_ship(ship_name);
            virtual_ships[ship_name] = ship;
            objects[ship.id] = ship;
        }

        ship.linked.push(paint);
        paint.linked.push(ship);
    }
}

function parse_raw_data_to_ship_object(object) {
    if (object.type != 'unknown') return;
    let is_extra_ptv = /(hangar\sdecoration)/i.test(object.raw_data.type) 
        && /(Greycat\sPTV)/i.test(object.raw_data.name);

    if (!/ship/i.test(object.raw_data.type) && !is_extra_ptv) return;

    object.variant = null;

    if (/(\d\d\d\d\sbest\sin\sshow)/i.test(object.name)) {
        object.name = object.name.replace(/(\d\d\d\d\sbest\sin\sshow)/i, '').trim();
        object.variant = "Best in Show Variant";
    }

    object.type = 'ship';
    object.manufacturer = object.raw_data.extra.replace(/\(.*?\)/, '').trim();
    object.name_normalized = object.name.toLowerCase();
};

function parse_raw_data_to_upgrade_object(object) {
    if (object.type != 'unknown') return;
    if (!/upgrade(\s|$)/i.test(object.raw_data.name)) return;
    object.type = 'upgrade';
    
    let name = object.name.replaceAll("Standard Edition", "");
    name = name.replaceAll("Warbond Edition", "");
    name = name.replaceAll("Standard Upgrade", "");
    name = name.replaceAll("Standard ...", "");
    name = name.replaceAll("Upgrade -", "");
    name = name.replaceAll(" To ", " to ");
    name = name.trim();
    let parts = name.split(' to ');

    object.from = parts[0].trim();
    object.to = parts[1].trim();
};

function parse_raw_data_to_paint_object(object) {
    if (object.type != 'unknown') return;
    if (!/skin/i.test(object.raw_data.type) 
        && !/skin|paint(\s|$)/i.test(object.raw_data.name)
    ) return;
    object.type = 'paint';

    let name = object.name;
    for (m in PAINT_PARSING_FIXES) {
        name = name.replaceAll(m, PAINT_PARSING_FIXES[m]);
    }
    let name_split = name.split('-');
    object.for = name_split[0] ? name_split[0].trim() : 'unknown';
    object.name = name_split[1] ? name_split[1].trim() : 'unknown';
};

function parse_raw_data_to_decoration_object(object) {
    if (object.type != 'unknown') return;
    if (!/(hangar\sdecoration)/i.test(object.raw_data.type)
        && !/(poster|miniature|model|plushie|cookie jar|coin|mug|pico|envelope|flag|planter|sextant|pennant|painting|charm|display)($|\s)/i.test(object.raw_data.name)
    ) return;
    object.type = 'decoration';
};

function parse_raw_data_to_gamepackage_object(object) {
    if (object.type != 'unknown') return;
    if (!/digital\sdownload/i.test(object.raw_data.name)) return;
    object.type = 'gamepackage';
};

function parse_raw_data_to_wallpaper_object(object) {
    if (object.type != 'unknown') return;
    if (!/wallpaper/i.test(object.raw_data.name)) return;
    object.type = 'wallpaper';
};

function parse_raw_data_to_hangar_object(object) {
    if (object.type != 'unknown') return;
    if (!/hangar/i.test(object.raw_data.name)) return;
    object.type = 'hangar';
};

function parse_raw_data_to_weapon_object(object) {  
    if (object.type != 'unknown') return;
    if (!/pistol|rifle|smg|lmg|knife|grenade|shotgun/i.test(object.raw_data.name)) return;
    object.type = 'weapon';
};

function parse_raw_data_to_equipment_object(object) {  
    if (object.type != 'unknown') return;
    if (!/equipment/i.test(object.raw_data.type)
        && !/(backpack|helmet|container|armor|legs|arms|core|hat|monocle|undersuit|sweater)($|\s)/i.test(object.raw_data.name)
    ) return;

    object.type = 'equipment';
};

function parse_raw_data_to_insurance_object(object) {
    if (!/insurance/i.test(object.raw_data.name)) return;
    object.type = 'insurance';
    object.sub_type = 'unknown';

    if (/lifetime/i.test(object.raw_data.name)) {
        object.sub_type = 'lifetime';
        object.months = 999;

    } else if (/iae/i.test(object.raw_data.name)) {
        object.sub_type = 'iae';
        object.months = 120;

    } else {
        let irr = /(\d+)(\s+|-)month(s|)/i.exec(object.raw_data.name);
        if (irr !== null && irr[1]) {
            let duration = parseInt(irr[1]);
            if (duration > 0) {
                object.sub_type = 'standard';
                object.months = duration;            
            }
        }
    }
};

function extract_objects_from_raw_pledges(raw_pledged) {
    object_id = 0;
    let objects = {};

    for (raw_pledge of raw_pledged) {
        let pledge_object = {};
        pledge_object.id = object_id++; //crypto.randomUUID();
        pledge_object.type = 'pledge';
        pledge_object.value = raw_pledge.value;
        pledge_object.link = raw_pledge.link;
        pledge_object.image = raw_pledge.image;
        pledge_object.raw_data = structuredClone(raw_pledge);
        pledge_object.raw_data.items = null;
        pledge_object.linked = [];
        objects[pledge_object.id] = pledge_object;

        for (raw_item of raw_pledge.items) {
            let object = {};
            object.id = object_id++; //crypto.randomUUID();
            object.type = 'unknown';
            object.name = raw_item.name;
            object.image = raw_item.image ? raw_item.image : pledge_object.image;
            object.raw_data = raw_item;
            object.linked = [pledge_object];
            objects[object.id] = object;
            pledge_object.linked.push(object);

            parse_raw_data_to_insurance_object(object);
            parse_raw_data_to_ship_object(object);
            parse_raw_data_to_upgrade_object(object);
            parse_raw_data_to_paint_object(object);
            parse_raw_data_to_gamepackage_object(object);
            parse_raw_data_to_hangar_object(object);
            parse_raw_data_to_wallpaper_object(object);
            parse_raw_data_to_decoration_object(object);
            parse_raw_data_to_weapon_object(object);
            parse_raw_data_to_equipment_object(object);
        }
    }

    return objects;
};

// CARD MAPPING ----------------------------------------------------------------------

function filter_cards(cards, filter_by, values) {    
    let filtered_cards = [];
    for (card of cards) {
        if (values.includes(card[filter_by])) {
            filtered_cards.push(card);
        }
    }
    return filtered_cards;
};

function sort_cards(cards) {
    cards.sort(function(a, b) {
        if (a.virtual && !b.virtual) return 1;
        if (!a.virtual && b.virtual) return -1;
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });
    return cards;
};

function group_cards(cards, group_by) {
    let grouped_cards = {};
    for (card of cards) {
        let group_value = card[group_by] ? card[group_by] : 'zzzzz';
        if (!grouped_cards[group_value]) {
            grouped_cards[group_value] = [];
        }
        grouped_cards[group_value].push(card);
    }

    const sorted_grouped_cards = Object.keys(grouped_cards).sort().reduce(function(obj, key) {
        let nkey = key
        if (key == 'zzzzz') nkey = 'unknown';
        obj[nkey] = grouped_cards[key]; 
        return obj;
    }, {});

    return sorted_grouped_cards;
}

function parse_object_into_ship_card(card) {
    if (card.object.type != 'ship') return;
    
    card.manufacturer = card.object.manufacturer;
    card.virtual = card.object.virtual ? card.object.virtual : false;
    card.variant = card.object.variant ? card.object.variant : null;

    if (!card.virtual) {
        let fyname = FLEETYARDS_SHIP_NAME_FIXES[card.name] || card.name
        fyname = fyname.replace(/ /g, "-").toLowerCase();
        card.fleetyards_link = FLEETYARDS_HOST + fyname + '/';
    }

    for (lobj of card.object.linked) {
        if (lobj.type == 'pledge') {
            for (llobj of lobj.linked) {
                llobj = structuredClone(llobj);
                llobj.raw_data = null;
                llobj.linked = null;

                if (llobj.type == 'insurance') {
                    if (!card.insurance
                        || llobj.sub_type == 'lifetime'
                        || (card.insurance && llobj.months > card.insurance.months)
                    ) {
                        card.insurance = llobj;
                        card.insurance_short = llobj.name;
                        card.insurance_months = llobj.months;
                    }

                } else if (llobj.type == 'hangar'
                    || llobj.type == 'gamepackage'
                ) {
                    let item = {};
                    item.name = llobj.name;
                    item.type = llobj.type;
                    card.items.push(item);
                }
            }

        } else if (lobj.type == 'paint' || lobj.type == 'upgrade') {
            let item = {};
            item.name = lobj.name;
            item.type = lobj.type;
            item.image = lobj.image;
            item.pledge_value = 'unknown';
            item.pledge_link = null;
            item.count = 1;

            for (llobj of lobj.linked) {
                if (llobj.type == 'pledge') {   
                    item.pledge_value = llobj.value;
                    item.pledge_link = llobj.link;
                    break;
                }
            }

            card.items.push(item);
        }
    }
};

function build_cards_from_objects(objects) {
    let cards = [];

    for (oid in objects) {
        let obj = objects[oid];
        let card = {};
        card.type = obj.type;
        card.name = obj.name;
        card.manufacturer = 'unknown';
        card.insurance_short = 'unknown';
        card.insurance_months = 0;
        card.pledge_value = 'unknown';
        card.pledge_link = null;
        card.insurance = null;
        card.image = obj.image;
        card.virtual = false;
        card.object = obj;
        card.items = [];

        parse_object_into_ship_card(card);

        for (lobj of card.object.linked) {
            if (lobj.type == 'pledge') {
                card.pledge_value = lobj.value;
                card.pledge_link = lobj.link;
                break;
            }
        }

        card.object = null;

        if (!['paint', 'insurance', 'pledge', 'upgrade', 'hangar', 'gamepackage'].includes(card.type)) {
            cards.push(card);
        }
    }

    cards = sort_cards(cards)
    return cards;
}

// DEBUGGING -------------------------------------------------------------------------

function json_stringify(object, space = "    ") {
    return JSON.stringify(object, get_circular_replacer(), space);
};

function get_circular_replacer() {
    const ancestors = [];
    return function (key, value) {
        if (typeof value !== "object" || value === null) {
            return value;
        }
        while (ancestors.length > 0 && ancestors.at(-1) !== this) {
            ancestors.pop();
        }
        if (ancestors.includes(value)) {
            return "[circular]";
        }
        ancestors.push(value);
        return value;
    };
};

function copy_data_to_clipboard() {
    let output = json_stringify(raw_pledge_data);
    navigator.clipboard.writeText(output);
};

function use_data_from_clipboard() {
    navigator.clipboard.readText().then(function(input) {
        raw_pledge_data = JSON.parse(input);
        set_cache(RSI_DATA_CACHE_KEY, raw_pledge_data, 6000000);
        process_raw_data_and_update_list();
    });
};

// RENDERING -------------------------------------------------------------------------

function tr(key, fallback = null) {
    return TRANSLATIONS[key] ? TRANSLATIONS[key] : (fallback ? fallback : key);
}

function render_grouped_cards(grouped_cards) {
    templates['group_tpl'].root.empty();

    for (card_group in grouped_cards) {
        let cards = grouped_cards[card_group];

        let group = templates['group_tpl'].html;

        let group_name = card_group;
        let replace_group_name_with = REPLACE_GROUP_NAME_WITH[settings.group_by] ?? null;
        if (replace_group_name_with && cards[0]) {
            group_name = cards[0][replace_group_name_with];
        }

        group = group.replaceAll('{$name}', tr('group_' + group_name, group_name));

        let $group = $(group);
        $group.removeAttr('id');

        let $card_root = $(templates['card_tpl'].id, $group).parent();
        $(templates['card_tpl'].id, $group).remove();
        templates['group_tpl'].root.append($group);

        for (card_data of cards) {
            let card = templates['card_tpl'].html;
            card = card.replaceAll('{$name}', card_data.name);

            card = card.replaceAll('{$image}', card_data.image ? 'background-image:url(\'' + card_data.image + '\')' : '');
            card = card.replaceAll('{$hide_image}', card_data.image || !card_data.virtual ? '' : 'hide');

            card = card.replaceAll('{$hide_unowned}', card_data.virtual ? '' : 'hide');

            card = card.replaceAll('{$pledge_value}', card_data.pledge_value);
            card = card.replaceAll('{$pledge_link}', card_data.pledge_link ? card_data.pledge_link : '');
            card = card.replaceAll('{$hide_pledge_link}', card_data.pledge_link ? '' : 'hide');
            
            card = card.replaceAll('{$fleetyards_link}', card_data.fleetyards_link ? card_data.fleetyards_link : '');
            card = card.replaceAll('{$hide_fleetyards}', card_data.fleetyards_link ? '' : 'hide');
                
            card = card.replaceAll('{$type}', tr('type_' + card_data.type, card_data.type));
            let hide_type = (settings.group_by == 'type' || card_data.type == 'unknown');
            card = card.replaceAll('{$hide_type}', hide_type ? 'hide' : '');

            card = card.replaceAll('{$manufacturer}', card_data.manufacturer);
            let hide_manufacturer = (settings.group_by == 'manufacturer' || card_data.manufacturer == 'unknown');
            card = card.replaceAll('{$hide_manufacturer}', hide_manufacturer ? 'hide' : '');

            card = card.replaceAll('{$insurance}', card_data.insurance_short);
            let hide_insurance = (settings.group_by == 'insurance_short' || card_data.insurance_short == 'unknown');
            card = card.replaceAll('{$hide_insurance}', hide_insurance ? 'hide' : '');
            
            card = card.replaceAll('{$hide_variant}', card_data.variant != null ? '' : 'hide');
            card = card.replaceAll('{$variant}', card_data.variant != null ? card_data.variant : 'unknown');

            let $card = $(card);
            $card.removeAttr('id');
            $('.hide', $card).hide();

            let $item_root = $(templates['item_tpl'].id, $card).parent();
            $(templates['item_tpl'].id, $card).remove();

            let hide_card = card_data.virtual;
            let items ={};

            for (item_data of card_data.items) {
                if (item_data.type == 'paint' 
                    && card_data.virtual 
                    && settings.hide_paints_in_virtual_ships
                ) continue;

                if (item_data.type == 'upgrade' 
                    && card_data.virtual 
                    && settings.hide_upgrades_in_virtual_ships
                ) continue;

                if (item_data.type == 'hangar' 
                    && settings.hide_hangars
                ) continue;

                let item = templates['item_tpl'].html;
                item = item.replaceAll('{$name}', item_data.name);
                item = item.replaceAll('{$image}', item_data.image ? 'background-image:url(\'' + item_data.image + '\')' : '');
                item = item.replaceAll('{$has_image}', item_data.image ? '1' : '0');
                item = item.replaceAll('{$pledge_value}', item_data.pledge_value);
                item = item.replaceAll('{$pledge_link}', item_data.pledge_link ? item_data.pledge_link : '');
                item = item.replaceAll('{$hide_pledge_link}', item_data.pledge_link ? '' : 'hide');

                let $item = $(item);
                $('.hide', $item).hide();
                $item.removeAttr('id');

                if (items[item_data.name] != undefined) {
                    $('.icons', items[item_data.name]).append($('.icons', $item).children());
                    items[item_data.name].item_count += 1;
                    $('span.count', $(items[item_data.name])[0]).text(' (' + items[item_data.name].item_count + ')');
                    continue;
                }
                $item.item_count = 1;
                items[item_data.name] = $item;

                $item_root.append($item);
                hide_card = false;
            }

            if (!hide_card) {
                $card_root.append($card);
            }
        }

    }
    
    $('[link_on_click]', templates['group_tpl'].root).each(function() {
        if ($(this).attr('link_on_click').length > 0) {
            $(this).css('cursor', 'pointer');
        }
    })

    $('[link_on_click]', templates['group_tpl'].root).on('click', function() {
        if ($(this).attr('link_on_click').length > 0) {
            window.open($(this).attr('link_on_click'), '_blank').focus();
        }
    })

    $('.item', templates['group_tpl'].root).on('mouseenter', function() {
        $('div.image[has_image="1"]', this).show();
        $('div.icons', this).show();
    })

    $('.item', templates['group_tpl'].root).on('mouseleave', function() {
        $('div.image[has_image="1"]', this).hide();
        $('div.icons', this).hide();
    })
};

function extract_templates() {
    let templates = {};
    $('.template', $root).each(function(i, e) {
        templates[$(e).attr('id')] = {
            id:   '#' + $(e).attr('id'),
            html: $(e).prop('outerHTML'),
            root: $(e).parent()
        }
    });
    $('.template', $root).each(function(i, e) {
        $(e).remove();
    });
    return templates;
};

// INITIATION ------------------------------------------------------------------------

function update_list() {
    $('#loading', $root).show();
    $('#card_container', $root).empty();

    let filtered_cards = filter_cards(cards, 'type', settings.show_types);
    let grouped_cards = group_cards(filtered_cards, settings.group_by);
    render_grouped_cards(grouped_cards);
    $('#loading', $root).hide();
};

function process_raw_data_and_update_list() {
    $('#loading', $root).show();
    $('#card_container', $root).empty();

    objects = extract_objects_from_raw_pledges(raw_pledge_data);
    link_upgrades_to_ships(objects);
    link_paints_to_ships(objects);
    cards = build_cards_from_objects(objects)
    update_list();
    console.log(objects);
    console.log(cards);
};

function update_data_and_list() {
    $('#loading', $root).show();
    $('#card_container', $root).empty();

    let cached_raw_data = get_cache(RSI_DATA_CACHE_KEY)
    if (cached_raw_data) {
        console.log('using cached rsi data');
        raw_pledge_data = cached_raw_data;
        process_raw_data_and_update_list();

    } else {
        console.log('caching fresh rsi data');
        extract_raw_data_from_rsi_pledges().then(function(raw_pledge_data_) {
            raw_pledge_data = raw_pledge_data_;
            set_cache(RSI_DATA_CACHE_KEY, raw_pledge_data, RSI_DATA_CACHE_TTL);
            process_raw_data_and_update_list();
        });
    }
};

function update_data_without_cache() {
    localStorage.removeItem(RSI_DATA_CACHE_KEY);
    update_data_and_list();
};

function update_settings_and_list() {
    settings.group_by = $('#group_by', $root).val(); 
    settings.show_types = $('#show_types', $root).val(); 
    settings.hide_paints_in_virtual_ships = $('#hide_paints_in_virtual_ships', $root).prop('checked');
    settings.hide_upgrades_in_virtual_ships = $('#hide_upgrades_in_virtual_ships', $root).prop('checked');
    settings.hide_hangars = $('#hide_hangars', $root).prop('checked');
    set_cache(SETTINGS_CACHE_KEY, settings)
    update_list();
};

function main($root_, load_data = true) {
    $root = $root_;

    $('#version', $root).text(VERSION);

    templates = extract_templates();

    let cached_settings = get_cache(SETTINGS_CACHE_KEY);
    if (cached_settings) {
        settings = {...settings, ...cached_settings};
    }

    $('#group_by', $root).val(settings.group_by);
    $('#group_by', $root).on('change', update_settings_and_list);

    $('#show_types', $root).val(settings.show_types);
    $('#show_types', $root).on('change', update_settings_and_list);

    $('#hide_paints_in_virtual_ships', $root).prop('checked', settings.hide_paints_in_virtual_ships);
    $('#hide_paints_in_virtual_ships', $root).on('change', update_settings_and_list);

    $('#hide_upgrades_in_virtual_ships', $root).prop('checked', settings.hide_upgrades_in_virtual_ships);
    $('#hide_upgrades_in_virtual_ships', $root).on('change', update_settings_and_list);

    $('#hide_hangars', $root).prop('checked', settings.hide_hangars);
    $('#hide_hangars', $root).on('change', update_settings_and_list);

    $('#invalidate_cache', $root).on('click', update_data_without_cache);
    $('#copy_data', $root).on('click', copy_data_to_clipboard);
    $('#insert_data', $root).on('click', use_data_from_clipboard);

    if (load_data) {
        update_data_and_list();
    }
};

//siis
$(function() {
    main($('#scfi'));
});
//siie


