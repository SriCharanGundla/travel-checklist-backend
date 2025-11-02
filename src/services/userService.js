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

const updateLastLogin = async (userId, { timezone, lastLoginAt } = {}) => {
  const updates = {
    lastLoginAt: lastLoginAt instanceof Date ? lastLoginAt : new Date(),
  };

  if (timezone) {
    updates.timezone = timezone;
  }

  await User.update(updates, {
    where: { id: userId },
    silent: true,
  });

  return updates.lastLoginAt;
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
