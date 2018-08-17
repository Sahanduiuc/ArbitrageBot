'use strict';

const lodash = require('lodash');
const configs = require('../config/settings');
const colors = require('colors');
const util = require('util');
const json2csv = require('json2csv');
const fs = require('fs');

let lastOpportunities = [];

exports.checkOpportunity = async function(prices) {

  let bestBid = lodash.maxBy(prices, function(item) {
    return item.bid
  });

  let bestAsk = lodash.minBy(prices, function(item) {
    return item.ask
  });
  console.log('condition:',bestBid.bid, bestAsk.ask );
  if (bestBid.bid > bestAsk.ask) {

    let funds = getFunds();
    let amount = funds / bestAsk.ask;

    let bought = bestAsk.ask * amount;
    let sould = bestBid.bid * amount;

    let cost = (bought * bestAsk.cost) + (sould * bestBid.cost);

    let estimatedGain = (sould - (bought + cost)).toFixed(2);
    let percentage = ((estimatedGain / funds) * 100).toFixed(2);

    let opportunity = {
      id: bestAsk.ticket.toLowerCase() + '-' + bestAsk.name + '-' + bestBid.name,
      created_at: new Date(),
      ticket: bestAsk.ticket,
      amount: Number(amount.toFixed(8)),
      buy_at: bestAsk.name,
      ask: bestAsk.ask,
      sale_at: bestBid.name,
      bid: bestBid.bid,
      gain: Number(percentage)
    }

    let index = lastOpportunities.indexOf(opportunity.id);
    if (index == -1 && percentage >= configs.arbitrage.openOpportunity) {

      console.log('');
      console.info('✔ Opportunity found:'.green);
      console.info('  Estimated gain:', colors.green(percentage), '% |', colors.green(estimatedGain));
      console.info('\n', util.inspect(opportunity, {
        colors: true
      }));

      register(opportunity);
      lastOpportunities.push(opportunity.id);

    } else if (index != -1 && percentage <= configs.arbitrage.closeOpportunity) {

      console.log('');
      console.info(colors.yellow('✔ Opportunity closed: %s'), opportunity.id);
      lastOpportunities.splice(index);

    }

  }

}

function getFunds() {
  return 1000.00;
}

function register(opportunity) {

  let toCsv = {
    data: opportunity,
    hasCSVColumnTitle: false
  };

  try {
    let csv = json2csv(toCsv) + '\r\n';
    fs.appendFile('data/arbitrage.csv', csv, function(err) {
      if (err) throw err;
    });
  } catch (error) {
    console.error(colors.red('Error:'), error.message);
  }

}