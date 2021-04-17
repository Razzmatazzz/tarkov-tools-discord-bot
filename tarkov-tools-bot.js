const Discord = require('discord.js')
const config = require('./config')

const discordClient = new Discord.Client()

var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

var barters = [];
var crafts = [];

discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`);

    getCraftsBarters();

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

function listServers(message) {
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
}

function leaveServer(serverid, message) {
    var response = new Discord.Message();
    if (discordClient.guilds.has(serverid)) {
        var server = discordClient.guilds.get(serverid);
        server.leave();
        response.content = "Left server " + server.name + " (" + server.id + ")";
    } else {
        message.react('❌');
        response.content = "Could not find server with id "+ serverid;
    }
    message.channel.send(response)
        .then(console.log)
        .catch(console.error);
}

function randomMap(args, message) {
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
}

function showHelp(helpcommand, message) {
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
}

function htmlSpecialChars(string) {
	return string.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function priceCheck(message) {
  var itemname = message.content.replace('!price ', '');
  var query = 'query { itemsByName(name: "'+itemname+'") { id name normalizedName shortName basePrice updated width height iconLink wikiLink imageLink link types avg24hPrice recoilModifier traderPrices { price trader { id name } } } }';
  ttRequest({ channel: message.channel, graphql: query}).then(function(response){
    if (response.hasOwnProperty('data') && response.data.hasOwnProperty('itemsByName')) {
      if (response.data.itemsByName.length > 0) {
        var endingsent = false;
        for (var i = 0; i < response.data.itemsByName.length; i++) {
          var item = response.data.itemsByName[i];
          var embed = new Discord.MessageEmbed();
          embed.type = "rich";
          embed.setTitle(item.name);
          embed.setURL(item.link);
          if (item.iconLink) {
              embed.setThumbnail(item.iconLink);
          } else {
              embed.setThumbnail(item.imageLink);
          }
          var size = parseInt(item.width)*parseInt(item.height);
          var bestTraderName = false;
          var bestTraderPrice = -1;
          for (const traderIndex in item.traderPrices) {
            var traderPrice = item.traderPrices[traderIndex];
            if (traderPrice.price > bestTraderPrice) {
              bestTraderPrice = traderPrice.price;
              bestTraderName = traderPrice.trader.name;
            }
          }
          if (item.avg24hPrice > 0) {
            var fleaPrice = parseInt(item.avg24hPrice).toLocaleString() + "₽";
            if (size > 1) {
              fleaPrice += "\r\n" + Math.round(parseInt(item.avg24hPrice) / size).toLocaleString() + "₽/slot";
            }
            embed.addField("Flea Price", fleaPrice, true);
          }
          if (bestTraderName) {
            var traderVal = bestTraderPrice.toLocaleString() + "₽";
            if (size > 1) {
              traderVal += "\r\n" + Math.round(bestTraderPrice / size).toLocaleString() + "₽/slot"
            }
            embed.addField(bestTraderName + " Value", traderVal, true);
          }
          for (const barterIndex in barters) {
            var b = barters[barterIndex];
            if (b.rewardItems[0].item.id == item.id) {
              var barterCost = 0;
              for (const reqIndex in b.requiredItems) {
                let reqItem = b.requiredItems[reqIndex];
                barterCost += reqItem.item.avg24hPrice*reqItem.count;
              }
              barterCost = Math.round(barterCost / b.rewardItems[0].count).toLocaleString() + "₽";
              embed.addField(b.source + " Barter", barterCost, true);
            }
          }
          for (const craftIndex in crafts) {
            var c = crafts[craftIndex];
            if (c.rewardItems[0].item.id == item.id) {
              var craftCost = 0;
              for (const reqIndex in c.requiredItems) {
                let reqItem = c.requiredItems[reqIndex];
                craftCost += reqItem.item.avg24hPrice*reqItem.count;
              }
              craftCost = Math.round(craftCost / c.rewardItems[0].count).toLocaleString() + "₽";
              if (c.rewardItems[0].count > 1) craftCost += ' ('+c.rewardItems[0].count+')';
              embed.addField(c.source + " Craft", craftCost, true);
            }
          }
          if (embed.fields.length == 0) {
            embed.setDescription('No prices available.');
          }
          message.channel.send(embed)
            .then(function(sentmessage){
              if (i == 2 && response.data.itemsByName.length > 3 && !endingsent) {
                  endingsent = true;
                  var ending = new Discord.MessageEmbed();
                  ending.type = "rich";
                  ending.setTitle("+" + (response.data.itemsByName.length - 3) + " more");
                  ending.setURL("https://tarkov-tools.com/?search=" + encodeURIComponent(message.content.replace('!price ', '')));
                  var otheritems = '';
                  for (var ii = 3; ii < response.data.itemsByName.length; ii++) {
                      var itemname = response.data.itemsByName[ii].name;
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
        console.error("Item search error: "+response.errors[errorIndex].message);
      }
    }
  }).catch(console.error);
}
function barterSearch(message) {
  var itemname = message.content.replace('!barter ', '').toLowerCase();
  var matchedBarters = [];
  for (const bid in barters) {
    let barter = barters[bid];
    if (barter.rewardItems[0].item.name.toLowerCase().includes(itemname)) {
      matchedBarters.push(barter);
    }
  }
  if (matchedBarters.length > 0) {
    var endingsent = false;
    for (let i = 0; i < matchedBarters.length; i++) {
      let barter = matchedBarters[i];
      let totalCost = 0;
      var embed = new Discord.MessageEmbed();
      embed.type = "rich";
      let title = barter.rewardItems[0].item.name;
      if (barter.rewardItems[0].count > 1) title += " ("+barter.rewardItems[0].count+")";
      title += "\r\n"+barter.source;
      embed.setTitle(title);
      embed.setURL(barter.rewardItems[0].item.link);
      if (barter.rewardItems[0].item.iconLink) {
          embed.setThumbnail(barter.rewardItems[0].item.iconLink);
      }
      for (const ri in barter.requiredItems) {
        let req = barter.requiredItems[ri];
        totalCost += req.item.avg24hPrice*req.count;
        embed.addField(req.item.name, req.item.avg24hPrice.toLocaleString()+"₽ x "+req.count, true);
      }
      embed.addField("Total", totalCost.toLocaleString()+"₽", true);
      message.channel.send(embed)
        .then(function(sentmessage){
          if (i == 2 && matchedBarters.length > 3 && !endingsent) {
              endingsent = true;
              var ending = new Discord.MessageEmbed();
              ending.type = "rich";
              ending.setTitle("+" + (matchedBarters.length - 3) + " more");
              ending.setURL("https://tarkov-tools.com/barters/?search=" + encodeURIComponent(itemname));
              var otheritems = '';
              for (var ii = 3; ii < matchedBarters.length; ii++) {
                  var bitemname = matchedBarters[ii].rewardItems[0].item.name+" ("+matchedBarters[ii].source+")";
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
}
function craftSearch(message) {
  var itemname = message.content.replace('!craft ', '').toLowerCase();
  var matchedCrafts = [];
  for (const id in crafts) {
    let craft = crafts[id];
    if (craft.rewardItems[0].item.name.toLowerCase().includes(itemname)) {
      matchedCrafts.push(craft);
    }
  }
  if (matchedCrafts.length > 0) {
    var endingsent = false;
    for (let i = 0; i < matchedCrafts.length; i++) {
      let craft = matchedCrafts[i];
      let totalCost = 0;
      var embed = new Discord.MessageEmbed();
      embed.type = "rich";
      let title = craft.rewardItems[0].item.name;
      if (craft.rewardItems[0].count > 1) title += " ("+craft.rewardItems[0].count+")";
      let measuredTime = new Date(null);
      measuredTime.setSeconds(craft.duration);
      title += "\r\n"+craft.source+ " ("+measuredTime.toISOString().substr(11, 8)+")";
      embed.setTitle(title);
      embed.setURL(craft.rewardItems[0].item.link);
      if (craft.rewardItems[0].item.iconLink) {
          embed.setThumbnail(craft.rewardItems[0].item.iconLink);
      }
      for (const ri in craft.requiredItems) {
        let req = craft.requiredItems[ri];
        totalCost += req.item.avg24hPrice*req.count;
        embed.addField(req.item.name, req.item.avg24hPrice.toLocaleString()+"₽ x "+req.count, true);
      }
      embed.addField("Total", totalCost.toLocaleString()+"₽", true);
      message.channel.send(embed)
        .then(function(sentmessage){
          if (i == 2 && matchedCrafts.length > 3 && !endingsent) {
              endingsent = true;
              var ending = new Discord.MessageEmbed();
              ending.type = "rich";
              ending.setTitle("+" + (matchedCrafts.length - 3) + " more");
              ending.setURL("https://tarkov-tools.com/hideout-profit/?search=" + encodeURIComponent(itemname));
              var otheritems = '';
              for (var ii = 3; ii < matchedCrafts.length; ii++) {
                  var citemname = matchedCrafts[ii].rewardItems[0].item.name+" ("+matchedCrafts[ii].source+")";
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
}
function getCraftsBarters() {
  var craftsQuery = 'query { crafts { source duration requiredItems { item { id name avg24hPrice } count } rewardItems { item { id name iconLink link } count } } }';
  ttRequest({ graphql: craftsQuery}).then(function(response){
    if (response.hasOwnProperty('data') && response.data.hasOwnProperty('crafts')) {
      crafts = response.data.crafts;
    }
  }).catch(error => console.error('Crafts query error: '+error.message));
  var bartersQuery = 'query { barters { source requiredItems { item { id name avg24hPrice } count } rewardItems { item { id name iconLink link } count } } }';
  ttRequest({ graphql: bartersQuery}).then(function(response){
    if (response.hasOwnProperty('data') && response.data.hasOwnProperty('barters')) {
      barters = response.data.barters;
    }
  }).catch(error => console.error('Barters query error: '+error.message));
}
function ttRequest(options) {
  return new Promise(function(resolve, reject) {
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
        console.error('bad request: '+vars);
      } else if (this.status == 403) {
        reject(new Error("403: forbidden"));
        console.error('forbidden: '+vars);
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
    xhttp.send(JSON.stringify({query: options['graphql']}));
  });
}
