const braintree = require('braintree');
const config = require('../src/core/config');
const db = require('../src/core/models');
const crypto = require('crypto');

const { models, mongoose } = db;

let gateway;

async function start() {
    let data = config.braintree;
    if (config.braintree.sandbox) {
        data.environment = braintree.Environment.Sandbox;
    } else {
        data.environment = braintree.Environment.Production;
    }
    gateway = await braintree.connect(data);
    gateway.subscription.search((search) => {
        search.status().is(braintree.Subscription.Status.Active);
    }, (err, subs) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        processSubscriptions(subs);
    });
}

async function processSubscriptions(subs) {
    const ids = subs.ids;
    const subsColl = db.collection('braintreesubscriptions');

    let currSubs = await subsColl.find({}, { projection: { _id: 1 } }).toArray();
    currSubs = currSubs.map(obj => obj._id);

    const missingSubs = ids.filter((i) => !currSubs.includes(i));

    console.log(`${missingSubs.length} out of ${ids.length} missing. ${currSubs.length} currently on the db`);

    for (let sub of missingSubs) {
        try {
            await restoreSubscription(sub);
        } catch (err) {
            console.error('Failed on sub', sub);
            console.error(err);
        }
    }

    process.exit(0);
}

async function restoreSubscription(subId) {
    console.log('Processing sub', subId);
    const premiumUserColl = db.collection('premiumusers');
    const sub = await fetchSubInfo(subId);
    const customer = await fetchCustomer(sub.transactions[0].customer.id);
    const discordId = customer.customFields.discordUserId;

    console.log('Successfuly fetched braintree information');
    console.log(discordId)

    const premiumUser = await premiumUserColl.findOne({ _id: discordId });
    if (premiumUser) {
        const subs = premiumUser.subscriptions;

        if (!subs.includes(subId)) {
            subs.push(subId);
        }

        const set = {
            paymentMethods: customer.paymentMethods,
            subscriptions: subs,
        };

        console.log('Premium user exists, updating');
        
        await premiumUserColl.updateOne({ _id: discordId }, { $set: set });
    } else {
        const premiumUser = {
            _id: discordId,
            subscriptions: [subId],
            customerId: customer.id,
            paymentMethods: customer.paymentMethods,
        };

        console.log('Premium user doesn\'t exists, creating');

        await premiumUserColl.insertOne(premiumUser);
    }

    const planToServerMap = {
        'premium-1x': 1,
        'premium-3x': 3,
        'premium-5x': 5,
    };

    const subsColl = db.collection('braintreesubscriptions');

    const subObj = {
        _id: sub.id,
        premiumUserId: discordId,
        firstBillingDate: sub.firstBillingDate,
        nextBillingDate: sub.nextBillingDate,
        planId: sub.planId,
        status: sub.status,
        paidThroughDate: sub.paidThroughDate,
        failureCount: sub.failureCount,
        paymentMethodToken: sub.paymentMethodToken,
        currentBillingCycle: sub.currentBillingCycle,
        numberOfBillingCycles: sub.numberOfBillingCycles,
        premiumSubscription: true,
        qty: planToServerMap[sub.planId],
    };

    console.log('Adding subscription on the db');

    await subsColl.insertOne(subObj);

    console.log('Success for', subId);
}

async function fetchSubInfo(id) {
    return new Promise((resolve, reject) => {
        gateway.subscription.find(id, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

async function fetchCustomer(id) {
    return new Promise((resolve, reject) => {
        gateway.customer.find(id, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

setTimeout(() => start(), 1000);
