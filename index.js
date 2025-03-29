require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const createAccountCmd = new SlashCommandBuilder()
  .setName('createaccount')
  .setDescription('Opret konto med licensnøgle')
  .addStringOption(option =>
    option.setName('key')
      .setDescription('Din licensnøgle')
      .setRequired(true)
  );

const downloadCmd = new SlashCommandBuilder()
  .setName('download')
  .setDescription('Download login system filen (login_system.exe)');

function loadJSON(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : [];
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function generateCredentials() {
  const rand = () => Math.random().toString(36).substring(2, 8);
  return { username: 'user' + rand(), password: rand() + rand().substring(0, 2) };
}

client.once('ready', async () => {
  console.log(`✅ Botten er online som ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), { body: [createAccountCmd.toJSON(), downloadCmd.toJSON()] });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'createaccount') {
    const key = interaction.options.getString('key');
    const keys = loadJSON("license_keys.json");
    const users = loadJSON("users.json");

    const keyObj = keys.find(k => k.key === key && !k.used);

    if (!keyObj) {
      await interaction.reply({ content: '❌ Ugyldig eller allerede brugt nøgle.', ephemeral: true });
      return;
    }

    const { username, password } = generateCredentials();
    users.push({ discord_id: interaction.user.id, username, password });
    keyObj.used = true;

    saveJSON("users.json", users);
    saveJSON("license_keys.json", keys);

    await interaction.user.send(`✅ Din konto er klar!\nBrugernavn: \`${username}\`\nAdgangskode: \`${password}\``);
    await interaction.reply({ content: '✅ Konto oprettet! Tjek dine DMs.', ephemeral: true });
  }

  if (interaction.commandName === 'download') {
    const users = loadJSON("users.json");
    const user = users.find(u => u.discord_id === interaction.user.id);

    if (!user) {
      await interaction.reply({
        content: '❌ Du skal oprette en konto med en licensnøgle først ved at bruge /createaccount.',
        ephemeral: true
      });
      return;
    }

    // Her bruger vi et downloadlink i stedet for at sende filen
    const downloadLink = 'https://link_to_your_hosted_file.com/login_system.exe'; // Erstat med dit eget downloadlink

    // Opret en Embed
    const embed = new EmbedBuilder()
      .setColor('#3498db') // Blå farve, kan ændres
      .setTitle('Download Login System')
      .setDescription('Klik på knappen nedenfor for at downloade filen.')
      .addFields({
        name: 'Download Link:',
        value: `[Download login_system.exe](${downloadLink})`
      })
      .setFooter({ text: 'Sørg for at være logget ind med en licensnøgle.' })
      .setTimestamp();

    // Send Embed som DM
    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ Downloadlink sendt til dine DMs.', ephemeral: true });
    } catch (error) {
      console.error('Kunne ikke sende DM:', error);
      await interaction.reply({ content: '❌ Jeg kunne ikke sende dig en DM. Sørg for, at dine DMs er åbne.', ephemeral: true });
    }
  }
});

client.login(process.env.BOT_TOKEN);
