'use strict';

const ccxt = require('ccxt');
const configs = require('../config/settings');
const arbitrage = require('./arbitrage');
const colors = require('colors');

const target_url = 'http://www.everforex.com/en';
const fetchCheerioObject = require('fetch-cheerio-object');

const exchange_conf = require('../config/exchanges.json');

////global vars/////
let convRatio = 1; 

exports.initialize = async function() {
  try {
    let exchanges = [];
    await conversionRate();

    if (configs.arbitrage.filter.exchanges) {
      exchanges = exchange_conf;
    } else {
      exchanges = ccxt.exchanges;
    }

    //console.log('started', exchanges);
    startArbitrageByTicket(exchanges);
    setInterval(function() {
      startArbitrageByTicket(exchanges)
    }, (configs.arbitrage.checkInterval > 0 ? configs.arbitrage.checkInterval : 1) * 6000);
    
  } catch (error) {
    console.log(error);
  }
}

function usdToAud (v){
  let vv = Math.round(v * 100 / convRatio) / 100
  return vv
}

async function conversionRate(){////Scraping ratio info from everforex, use VPN in China !!!

  fetchCheerioObject(target_url)
  .then($ => {
      const precision = 10000 /// 4 digits under points
      let wbuy = $("#RealtimeCustomerRateSmall1_rptRates_ctl09_lblBuy").text()
      let wsell = $("#RealtimeCustomerRateSmall1_rptRates_ctl09_lblSell").text()
      
      wbuy = parseFloat(wbuy)
      wsell = parseFloat(wsell)

      let obuy = (wbuy + wsell) / 2 - (wsell - wbuy) * ((1 + configs.market.convertionSpread) / 2)
      obuy = Math.round(obuy*precision)/precision
      let osell = (wbuy + wsell) / 2 + (wsell - wbuy) * ((1 + configs.market.convertionSpread) / 2)
      osell = Math.round(osell*precision)/precision

      let temp_v = Math.round(obuy*precision)/precision
      if( temp_v > 0) {
        convRatio = temp_v
      }
      console.log(`Spread: ${configs.market.convertionSpread},  Their Buy/Sell:${wbuy} / ${wsell}, 
      Our Buy/Sell:${obuy} / ${osell}, ConvRatio:${convRatio}`)

    }, error => {
      //resetGlobals()
      let error_code = 'Everforex error'      
      console.log(error_code, error)
    });
}

async function startArbitrageByTicket(exchanges) {
  try {
    let promises = exchanges.map(async (exchange) => 
      Promise.resolve(await fetchDataByTicketAndExchange(exchange))
    );

    Promise.all(promises).then((response) => {
      //console.log('Response:',response);
      arbitrage.checkOpportunity(response);
    }).catch((error) => {
      console.error(colors.red('Error:'), error.message);
    });

  } catch (error) {
    console.error(colors.red('Error:'), error.message);
  }
}

async function fetchDataByTicketAndExchange(exchange) {
  let result = {
    name: exchange.id,
    cost: exchange.takerFee,
    bid: 0,
    ask: 0,
  };

  try {
    const exchange_instance = new ccxt[exchange.id]();
    exchange_instance.apiKey = exchange.apiKey;
    exchange_instance.secret = exchange.secret;

    const market = await exchange_instance.fetchTicker(exchange.symbol);
    
    if (market != undefined && market != null) {
      result.bid = (exchange.usdToAud) ? usdToAud(market.bid) : market.bid 
      result.ask = (exchange.usdToAud) ? usdToAud(market.ask) : market.ask 
    }
    
    // const balance = await exchange_instance.fetchBalance();
    // console.log(`${exchange.id} Balance:`, balance);

  } catch (error) {
    result.error = error;
    console.log(error);
  } finally {
    console.log(result);    
    return result;
  }
}

