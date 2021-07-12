const config = require('../config');
const Task = require('../Task');
const logger = require('../logger')('Reminders', 'reminders');

class Reminders extends Task {
    constructor() {
        super();

        logger.info('Starting Reminders Task.');

        // this.schedule('*/1 * * * *', this.processReminders.bind(this));
    }

    // async processReminders() {
	// 	try {
	// 		var docs = await this.models.Reminder.find({ completedAt: { $lte: Date.now() } }).lean().exec();
	// 		if (!docs || !docs.length) {
	// 			return false;
	// 		}
	// 	} catch (e) {
	// 		return logger.error(e);
	// 	}

	// 	this.asyncForEach(docs, (doc) => {
    //         try {
    //             var user = await this.client.getRESTUser(doc.user);
    //         } catch (err) {
    //             return logger.error(err);
    //         }

    //         if (!user) {
    //             return;
    //         }

	// 		this.sendDM(user.id, `**Reminder:** ${doc.content}`).catch(() => null);
	// 		this.models.Reminder.remove({ _id: doc._id }).catch(err => logger.error(err));
	// 	});
	// }
}

const task = new Reminders();
