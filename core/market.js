'use strict';

const ccxt = require('ccxt');
const configs = require('../config/settings');
const arbitrage = require('./arbitrage');
const colors = require('colors');

exports.initialize = async function() {
  try {
    let exchanges = [];
    let ticket = 'BTC/USD';

    if (configs.arbitrage.filter.exchanges) {
      exchanges = configs.arbitrage.exchanges;
    } else {
      exchanges = ccxt.exchanges;
    }
    if (configs.arbitrage.filter.tickets) {
      ticket = configs.arbitrage.pair;
    } 
    console.log('started', exchanges, ticket);
    startArbitrageByTicket(exchanges, ticket);
    setInterval(function() {
      console.log('started', exchanges, ticket);
      startArbitrageByTicket(exchanges, ticket)
    }, (configs.arbitrage.checkInterval > 0 ? configs.arbitrage.checkInterval : 1) * 60000);
    
  } catch (error) {
    console.log(error);
  }
}

async function startArbitrageByTicket(exchanges, ticket) {
  try {
    let promises = exchanges.map(async (exchange) =>
      Promise.resolve(await fetchDataByTicketAndExchange(
        ticket, exchange)));

    Promise.all(promises).then((response) => {
      console.log('Response:',response);
      arbitrage.checkOpportunity(response);
    }).catch((error) => {
      console.error(colors.red('Error:'), error.message);
    });
  } catch (error) {
    console.error(colors.red('Error:'), error.message);
  }
}

async function fetchDataByTicketAndExchange(ticket, exchangeName) {
  let result = {
    name: exchangeName,
    ticket: ticket,
    cost: 0.005,
    bid: 0,
    ask: 0
  };

  try {
    const exchange = new ccxt[exchangeName]();
    const market = await exchange.fetchTicker(ticket);
    
    if (market != undefined && market != null) {
      result.bid = market.bid;
      result.ask = market.ask;
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.log(result);
    return result;
  }
}

