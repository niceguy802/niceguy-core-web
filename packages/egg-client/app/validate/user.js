module.exports = {
  login: {
    username: { type: 'string', required: true, min: 3, max: 20 },
    password: { type: 'string', required: true, min: 6, max: 20 },
  },
};
