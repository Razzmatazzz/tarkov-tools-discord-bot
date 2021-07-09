const Discord = require('discord.js')
const config = require('./config')

const discordClient = new Discord.Client()

const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let barters = [];
let crafts = [];
let currencies = {'RUB': 1};

discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);

    getCraftsBarters();
    getCurrencies();

    discordClient.user.setActivity('tarkov-tools.com', { type: 'PLAYING' })
        .then(presence => { console.log('Activity set to Playing tarkov-tools.com') })
        .catch(console.error);
});

discordClient.login(config.discordApiToken);

discordClient.on('guildCreate', guild => {
    if (!guild.available) return;
    console.log(`Joined server ${guild.name} (${guild.id})!`);
    //optionally do something to notify you when the bot joins a new server
});

discordClient.on('message', message => {
    //console.log(message);
    if (message.channel.type != 'dm' && message.channel.type != 'text') return;
    if (message.content.toLowerCase().indexOf('!price ') == 0) {
        priceCheck(message);
    } else if (message.content.toLowerCase().indexOf('!help') == 0) {
        var helpcommand = message.content.toLowerCase().replace('!help', '').trim();
        showHelp(helpcommand, message);
    } else if (message.content.toLowerCase().indexOf('!map') == 0) {
        var args = message.content.toLowerCase().replace('!map', '').trim().toLowerCase();
        randomMap(args, message);
    } else if (message.content.toLowerCase().indexOf('!barter ') == 0) {
        barterSearch(message);
    } else if (message.content.toLowerCase().indexOf('!craft ') == 0) {
        craftSearch(message);
    }
    if ((message.author.id == config.adminId || (config.adminId instanceof Array && config.adminId.includes(message.author.id))) && message.channel.type == 'dm') {
        if (message.content.toLowerCase().indexOf('!servers') == 0) {
            listServers(message);
        } else if (message.content.toLowerCase().indexOf('!leaveserver ') == 0) {
            var serverid = message.content.toLowerCase().replace('!leaveserver ', '');
            leaveServer(serverid, message);
        }
    }
});

const listServers = (message) => {
    var embed = new Discord.MessageEmbed();
    embed.type = "rich";
    embed.setTitle("Servers");
    discordClient.guilds.each(server => {
        embed.addField(server.name, server.id);
    });
    if (embed.length == 0) {
        message.react('❌');
    } else {
        message.channel.send(embed)
            .then(console.log)
            .catch(console.error);
    }
};

const leaveServer = (serverid, message) => {
    var response = new Discord.Message();
    if (discordClient.guilds.has(serverid)) {
        var server = discordClient.guilds.get(serverid);
        server.leave();
        response.content = "Left server " + server.name + " (" + server.id + ")";
    } else {
        message.react('❌');
        response.content = "Could not find server with id " + serverid;
    }
    message.channel.send(response)
        .then(console.log)
        .catch(console.error);
};

const randomMap = (args, message) => {
    args = args.split(' ');
    var maps = [];
    var skips = [];
    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        if (arg.indexOf('-') == 0) {
            arg = arg.replace('-', '');
            skips.push(arg);
        } else if (arg.length > 0) {
            maps.push(arg);
        }
    }
    if (maps.length == 0) {
        maps = ['customs', 'woods', 'interchange', 'reserve', 'factory', 'shoreline', 'labs'];
    }
    for (var i = 0; i < skips.length; i++) {
        let index = maps.findIndex(element => {
            if (element === skips[i]) {
                return true;
            }
        });
        if (index != -1) {
            maps.splice(index, 1);
        }
    }
    if (maps.length > 0) {
        var response = new Discord.Message();
        var map = maps[Math.floor(Math.random() * maps.length)];
        map = map.charAt(0).toUpperCase() + map.slice(1);
        response.content = map;
        message.channel.send(response)
            .then(console.log)
            .catch(console.error);
    } else {
        message.react('❌');
    }
};

const showHelp = (helpcommand, message) => {
    var commands = {
        'help': { syntax: '!help [{command}]', description: 'Show details for {command}', examples: '!help rig' },
        'map': { syntax: '!map [{mapname} {mapname}] [-{mapname}]', description: 'Select a random map', examples: '!map -woods\r\n!map customs shoreline interchange' },
        'price': { syntax: '!price {itemname}', description: 'Show prices for item(s) matching {itemname}', examples: '!price bitcoin' },
        'barter': { syntax: '!barter {itemname}', description: 'Shows barter trades for item(s) matching {itemname}', examples: '!barter slick' },
        'craft': { syntax: '!craft {itemname}', description: 'Shows crafts for item(s) matching {itemname}', examples: '!craft 7n31' }
    };
    var embed = new Discord.MessageEmbed();
    embed.type = "rich";
    if (helpcommand == '') {
        embed.setTitle("Available Commands");
        for (const command in commands) {
            var c = commands[command];
            embed.addField(c.syntax, c.description);
        }
    } else {
        if (commands.hasOwnProperty(helpcommand)) {
            var c = commands[helpcommand];
            embed.setTitle("!" + helpcommand + " command help");
            embed.addField(c.syntax, c.description + "\r\nExamples:\r\n" + c.examples);
        }
    }
    if (embed.length > 0) {
        message.channel.send(embed)
            .then(console.log)
            .catch(console.error);
    } else {
        message.react('❌');
    }
};

const htmlSpecialChars = (string) => {
    return string.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
};

const priceCheck = async (message) => {
    const itemname = message.content.replace('!price ', '');
    const query = 'query { itemsByName(name: "' + itemname + '") { id name normalizedName shortName basePrice updated width height iconLink wikiLink imageLink link types avg24hPrice recoilModifier traderPrices { price trader { id name } } buyFor { source price currency requirements { type value } } } }';
    try {
        const response = await ttRequest({ channel: message.channel, graphql: query });
        if (response.hasOwnProperty('data') && response.data.hasOwnProperty('itemsByName')) {
            if (response.data.itemsByName.length > 0) {
                let endingsent = false;
                for (let i = 0; i < response.data.itemsByName.length; i++) {
                    const item = response.data.itemsByName[i];
                    const embed = new Discord.MessageEmbed();
                    embed.type = "rich";
                    embed.setTitle(item.name);
                    embed.setURL(item.link);
                    if (item.iconLink) {
                        embed.setThumbnail(item.iconLink);
                    } else {
                        embed.setThumbnail(item.imageLink);
                    }
                    const size = parseInt(item.width) * parseInt(item.height);
                    let bestTraderName = false;
                    let bestTraderPrice = -1;
                    for (const traderIndex in item.traderPrices) {
                        const traderPrice = item.traderPrices[traderIndex];
                        if (traderPrice.price > bestTraderPrice) {
                            bestTraderPrice = traderPrice.price;
                            bestTraderName = traderPrice.trader.name;
                        }
                    }
                    if (item.avg24hPrice > 0) {
                        let fleaPrice = parseInt(item.avg24hPrice).toLocaleString() + "₽";
                        if (size > 1) {
                            fleaPrice += "\r\n" + Math.round(parseInt(item.avg24hPrice) / size).toLocaleString() + "₽/slot";
                        }
                        embed.addField("Flea Price (avg)", fleaPrice, true);
                    }
                    if (item.lastLowPrice > 0) {
                        let fleaPrice = parseInt(item.lastLowPrice).toLocaleString() + "₽";
                        if (size > 1) {
                            fleaPrice += "\r\n" + Math.round(parseInt(item.avg24hPrice) / size).toLocaleString() + "₽/slot";
                        }
                        embed.addField("Flea Price (low)", fleaPrice, true);
                    }
                    if (bestTraderName) {
                        let traderVal = bestTraderPrice.toLocaleString() + "₽";
                        if (size > 1) {
                            traderVal += "\r\n" + Math.round(bestTraderPrice / size).toLocaleString() + "₽/slot"
                        }
                        embed.addField(bestTraderName + " Value", traderVal, true);
                    }
                    for (const offerindex in item.buyFor) {
                        const offer = item.buyFor[offerindex];
                        if (offer.source == 'fleaMarket') continue;
                        let traderPrice = (parseInt(offer.price) * currencies[offer.currency]).toLocaleString() + "₽";
                        let level = 1;
                        let quest = '';
                        for (const reqindex in offer.requirements) {
                            const req = offer.requirements[reqindex];
                            if (req.type == 'loyaltyLevel') {
                                level = req.value;
                            } else if (req.type == 'questCompleted') {
                                quest = req.value;
                            }
                        }
                        if (quest) {
                            quest = ' +Task';
                        }
                        let trader = offer.source.charAt(0).toUpperCase() + offer.source.slice(1);
                        embed.addField(`${trader} LL${level}${quest} Price`, traderPrice);
                    }
                    for (const barterIndex in barters) {
                        const b = barters[barterIndex];
                        if (b.rewardItems[0].item.id == item.id) {
                            let barterCost = 0;
                            for (const reqIndex in b.requiredItems) {
                                const req = b.requiredItems[reqIndex];
                                let itemCost = req.item.avg24hPrice;
                                if (req.item.lastLowPrice > itemCost && req.item.lastLowPrice > 0) itemCost = req.item.lastLowPrice;
                                for (const offerindex in req.item.buyFor) {
                                    const offer = req.item.buyFor[offerindex];
                                    if (offer.source == 'fleaMarket') continue;
                                    let traderPrice = offer.price * currencies[offer.currency];
                                    if (traderPrice < itemCost || itemCost == 0) itemCost = traderPrice;
                                }
                                barterCost += itemCost * req.count;
                            }
                            barterCost = Math.round(barterCost / b.rewardItems[0].count).toLocaleString() + "₽";
                            embed.addField(b.source + " Barter", barterCost, true);
                        }
                    }
                    for (const craftIndex in crafts) {
                        const c = crafts[craftIndex];
                        if (c.rewardItems[0].item.id == item.id) {
                            let craftCost = 0;
                            for (const reqIndex in c.requiredItems) {
                                const req = c.requiredItems[reqIndex];
                                let itemCost = req.item.avg24hPrice;
                                if (req.item.lastLowPrice > itemCost && req.item.lastLowPrice > 0) itemCost = req.item.lastLowPrice;
                                for (const offerindex in req.item.buyFor) {
                                    const offer = req.item.buyFor[offerindex];
                                    if (offer.source == 'fleaMarket') continue;
                                    let traderPrice = offer.price * currencies[offer.currency];
                                    if (traderPrice < itemCost || itemCost == 0) itemCost = traderPrice;
                                }
                                craftCost += itemCost * req.count;
                            }
                            craftCost = Math.round(craftCost / c.rewardItems[0].count).toLocaleString() + "₽";
                            if (c.rewardItems[0].count > 1) craftCost += ' (' + c.rewardItems[0].count + ')';
                            embed.addField(c.source + " Craft", craftCost, true);
                        }
                    }
                    if (embed.fields.length == 0) {
                        embed.setDescription('No prices available.');
                    }
                    message.channel.send(embed)
                        .then(function (sentmessage) {
                            if (i == 2 && response.data.itemsByName.length > 3 && !endingsent) {
                                endingsent = true;
                                const ending = new Discord.MessageEmbed();
                                ending.type = "rich";
                                ending.setTitle("+" + (response.data.itemsByName.length - 3) + " more");
                                ending.setURL("https://tarkov-tools.com/?search=" + encodeURIComponent(message.content.replace('!price ', '')));
                                let otheritems = '';
                                for (let ii = 3; ii < response.data.itemsByName.length; ii++) {
                                    const itemname = response.data.itemsByName[ii].name;
                                    if (itemname.length + 4 + otheritems.length > 2048) {
                                        ending.setFooter("Not all results shown.");
                                        break;
                                    }
                                    otheritems += itemname + "\r\n";
                                }
                                ending.setDescription(otheritems);
                                message.channel.send(ending)
                                    .then(console.log)
                                    .catch(console.error);
                            }
                        })
                        .catch(console.error);
                    if (i == 2) break;
                }
            } else {
                message.react('❌');
            }
        } else if (response.hasOwnProperty('errors')) {
            for (const errorIndex in response.errors) {
                console.error("Item search error: " + response.errors[errorIndex].message);
            }
        }
    } catch (error) {
        console.error(error);
    }
};

const barterSearch = (message) => {
    const itemname = message.content.replace('!barter ', '').toLowerCase();
    const matchedBarters = [];
    for (const bid in barters) {
        const barter = barters[bid];
        if (barter.rewardItems[0].item.name.toLowerCase().includes(itemname)) {
            matchedBarters.push(barter);
        }
    }
    if (matchedBarters.length > 0) {
        var endingsent = false;
        for (let i = 0; i < matchedBarters.length; i++) {
            const barter = matchedBarters[i];
            let totalCost = 0;
            const embed = new Discord.MessageEmbed();
            embed.type = "rich";
            let title = barter.rewardItems[0].item.name;
            if (barter.rewardItems[0].count > 1) title += " (" + barter.rewardItems[0].count + ")";
            title += "\r\n" + barter.source;
            embed.setTitle(title);
            embed.setURL(barter.rewardItems[0].item.link);
            if (barter.rewardItems[0].item.iconLink) {
                embed.setThumbnail(barter.rewardItems[0].item.iconLink);
            }
            for (const ri in barter.requiredItems) {
                const req = barter.requiredItems[ri];
                let itemCost = req.item.avg24hPrice;
                if (req.item.lastLowPrice > itemCost && req.item.lastLowPrice > 0) itemCost = req.item.lastLowPrice;
                for (const offerindex in req.item.buyFor) {
                    const offer = req.item.buyFor[offerindex];
                    if (offer.source == 'fleaMarket') continue;
                    let traderPrice = offer.price * currencies[offer.currency];
                    if (traderPrice < itemCost || itemCost == 0) itemCost = traderPrice;
                }
                totalCost += itemCost * req.count;
                embed.addField(req.item.name, itemCost.toLocaleString() + "₽ x " + req.count, true);
            }
            embed.addField("Total", totalCost.toLocaleString() + "₽", true);
            message.channel.send(embed)
                .then(function (sentmessage) {
                    if (i == 2 && matchedBarters.length > 3 && !endingsent) {
                        endingsent = true;
                        const ending = new Discord.MessageEmbed();
                        ending.type = "rich";
                        ending.setTitle("+" + (matchedBarters.length - 3) + " more");
                        ending.setURL("https://tarkov-tools.com/barters/?search=" + encodeURIComponent(itemname));
                        let otheritems = '';
                        for (let ii = 3; ii < matchedBarters.length; ii++) {
                            const bitemname = matchedBarters[ii].rewardItems[0].item.name + " (" + matchedBarters[ii].source + ")";
                            if (bitemname.length + 4 + otheritems.length > 2048) {
                                ending.setFooter("Not all results shown.");
                                break;
                            }
                            otheritems += bitemname + "\r\n";
                        }
                        ending.setDescription(otheritems);
                        message.channel.send(ending)
                            .then(console.log)
                            .catch(console.error);
                    }
                })
                .catch(console.error);
            if (i == 2) break;
        }
    } else {
        message.react('❌');
    }
};

const craftSearch = (message) => {
    const itemname = message.content.replace('!craft ', '').toLowerCase();
    const matchedCrafts = [];
    for (const id in crafts) {
        const craft = crafts[id];
        if (craft.rewardItems[0].item.name.toLowerCase().includes(itemname)) {
            matchedCrafts.push(craft);
        }
    }
    if (matchedCrafts.length > 0) {
        let endingsent = false;
        for (let i = 0; i < matchedCrafts.length; i++) {
            const craft = matchedCrafts[i];
            let totalCost = 0;
            const embed = new Discord.MessageEmbed();
            embed.type = "rich";
            let title = craft.rewardItems[0].item.name;
            if (craft.rewardItems[0].count > 1) title += " (" + craft.rewardItems[0].count + ")";
            const measuredTime = new Date(null);
            measuredTime.setSeconds(craft.duration);
            title += "\r\n" + craft.source + " (" + measuredTime.toISOString().substr(11, 8) + ")";
            embed.setTitle(title);
            embed.setURL(craft.rewardItems[0].item.link);
            if (craft.rewardItems[0].item.iconLink) {
                embed.setThumbnail(craft.rewardItems[0].item.iconLink);
            }
            for (const ri in craft.requiredItems) {
                const req = craft.requiredItems[ri];
                let itemCost = req.item.avg24hPrice;
                if (req.item.lastLowPrice > itemCost && req.item.lastLowPrice > 0) itemCost = req.item.lastLowPrice;
                for (const offerindex in req.item.buyFor) {
                    const offer = req.item.buyFor[offerindex];
                    if (offer.source == 'fleaMarket') continue;
                    let traderPrice = offer.price * currencies[offer.currency];
                    if (traderPrice < itemCost || itemCost == 0) itemCost = traderPrice;
                }

                totalCost += itemCost * req.count;
                //totalCost += req.item.avg24hPrice * req.count;
                embed.addField(req.item.name, itemCost.toLocaleString() + "₽ x " + req.count, true);
            }
            embed.addField("Total", totalCost.toLocaleString() + "₽", true);
            message.channel.send(embed)
                .then(function (sentmessage) {
                    if (i == 2 && matchedCrafts.length > 3 && !endingsent) {
                        endingsent = true;
                        const ending = new Discord.MessageEmbed();
                        ending.type = "rich";
                        ending.setTitle("+" + (matchedCrafts.length - 3) + " more");
                        ending.setURL("https://tarkov-tools.com/hideout-profit/?search=" + encodeURIComponent(itemname));
                        let otheritems = '';
                        for (let ii = 3; ii < matchedCrafts.length; ii++) {
                            const citemname = matchedCrafts[ii].rewardItems[0].item.name + " (" + matchedCrafts[ii].source + ")";
                            if (citemname.length + 4 + otheritems.length > 2048) {
                                ending.setFooter("Not all results shown.");
                                break;
                            }
                            otheritems += citemname + "\r\n";
                        }
                        ending.setDescription(otheritems);
                        message.channel.send(ending)
                            .then(console.log)
                            .catch(console.error);
                    }
                })
                .catch(console.error);
            if (i == 2) break;
        }
    } else {
        message.react('❌');
    }
};

const getCraftsBarters = async () => {
    const craftsQuery = 'query { crafts { source duration requiredItems { item { id name avg24hPrice lastLowPrice buyFor { source price currency requirements { type value } } } count } rewardItems { item { id name iconLink link } count } } }';
    const bartersQuery = 'query { barters { source requiredItems { item { id name avg24hPrice lastLowPrice buyFor { source price currency requirements { type value } } } count } rewardItems { item { id name iconLink link } count } } }';
    const responses = await Promise.all([ttRequest({ graphql: craftsQuery }), ttRequest({ graphql: bartersQuery })]).catch(error => {
        console.error(`Barters query error: ${error.message}`);
    });
    crafts = responses[0].data.crafts;
    barters = responses[1].data.barters;
};
const getCurrencies = async () => {
    const dollarsQuery = 'query { item(id: "5696686a4bdc2da3298b456a") { buyFor { source price currency requirements { type value } } } }';
    const eurosQuery = 'query { item(id: "569668774bdc2da2298b4568") { buyFor { source price currency requirements { type value } } } }';
    const responses = await Promise.all([ttRequest({ graphql: dollarsQuery }), ttRequest({ graphql: eurosQuery })]);
    currencies['USD'] = responses[0].data.item.buyFor[0].price;
    currencies['EUR'] = responses[1].data.item.buyFor[0].price;
};
const ttRequest = async (options) => {
    return new Promise((resolve, reject) => {
        if (!options.hasOwnProperty('graphql')) {
            reject(new Error("you must provide graphql"));
            return;
        }

        if (options.hasOwnProperty('channel')) {
            options.channel.startTyping();
        }

        var xhttp = new XMLHttpRequest();
        xhttp.onload = function () {
            if (options.hasOwnProperty('channel')) {
                options.channel.stopTyping();
            }
            if (this.status == 200) {
                var response = JSON.parse(this.responseText);
                if (!response.hasOwnProperty('errors')) {
                    resolve(response);
                } else {
                    reject(new Error(response.errors[0].message));
                }
            } else if (this.status == 400) {
                reject(new Error("400: bad request"));
                console.error('bad request: ' + vars);
            } else if (this.status == 403) {
                reject(new Error("403: forbidden"));
                console.error('forbidden: ' + vars);
            }
        };
        xhttp.onerror = function (test) {
            if (options.hasOwnProperty('channel')) {
                options.channel.stopTyping();
            }
            reject(new Error(JSON.stringify(test)));
            console.error("** An error occurred during the request");
            console.error(test);
        };
        xhttp.ontimeout = function () {
            if (options.hasOwnProperty('channel')) {
                options.channel.stopTyping();
            }
            reject(new Error("request timeout"));
            console.error("** The rquest timed out");
            console.error(this);
            console.error(JSON.stringify(args));
        };
        xhttp.open("POST", "https://tarkov-tools.com/graphql");
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send(JSON.stringify({ query: options['graphql'] }));
    });
};
