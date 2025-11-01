const { User } = require('../models');

const createUser = async (payload, options = {}) => {
  const user = await User.create(payload, options);
  return user;
};

const findUserByEmail = (email) =>
  User.scope('withPassword').findOne({
    where: { email: email.toLowerCase() },
  });

const findUserById = (id) => User.findByPk(id);

const updateLastLogin = async (userId) => {
  await User.update(
    { lastLoginAt: new Date() },
    {
      where: { id: userId },
      silent: true,
    }
  );
};

const updatePassword = async (userId, passwordHash) => {
  await User.update(
    { passwordHash },
    {
      where: { id: userId },
      silent: true,
      individualHooks: false,
    }
  );
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
  updatePassword,
};
