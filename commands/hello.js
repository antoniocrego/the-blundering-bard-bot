const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello to the bot'),

  async execute(interaction) {
    // 1/1000 chance
    const roll = Math.floor(Math.random() * 1000);

    if (roll === 0) {
      return interaction.reply('Fuck you 😡'); // the rare rude response
    }

    // Normal response
    return interaction.reply('Hello! 👋');
  }
};
