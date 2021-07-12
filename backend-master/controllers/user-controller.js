class UserController {
	static async getUser(req, res, next, User) {
		try {
			const user = await User.find({where: {id: id}});
			if (user) {
				return user;
			}
		} catch (error) {
			console.error(error);
			res.status(500);
			res.json({
				message: 'Internal error'
			});
		}
		return next();
	}

	static async getUsers(ids) {

	}

	static async createUser(id) {

	}

	static async modifyUser(id) {

	}

	static async deleteUser(id) {

	}
}

module.exports = UserController;
