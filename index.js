const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  EmbedBuilder,
} = require("discord.js");

/* ===================== CLIENT ===================== */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

/* ===================== READY ===================== */

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  const cmd = new SlashCommandBuilder()
    .setName("mdspace")
    .setDescription("ยืนยันตัวตน MD Space");

  // ล้างคำสั่งเก่า + เหลือแค่ mdspace
  await client.application.commands.set([cmd]);
});

/* ===================== INTERACTION ===================== */

client.on("interactionCreate", async (interaction) => {
  try {
    /* ---------- /mdspace ---------- */
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== "mdspace") return;

      const modal = new ModalBuilder()
        .setCustomId("md_modal")
        .setTitle("ยืนยันตัวตน MD");

      const nameInput = new TextInputBuilder()
        .setCustomId("md_name")
        .setLabel("กรอกชื่อ")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput)
      );

      return interaction.showModal(modal);
    }

    /* ---------- MODAL SUBMIT ---------- */
    if (interaction.type === InteractionType.ModalSubmit) {
      if (interaction.customId !== "md_modal") return;

      const name = interaction.fields.getTextInputValue("md_name");
      const member = await interaction.guild.members.fetch(interaction.user.id);

      // เปลี่ยนชื่อ [MD]
      await member.setNickname(`[MD] ${name}`).catch(() => {});

      // ให้ยศหลัก 2 ยศ
      const baseRoles = [
        process.env.ROLE_SPACE_MEDIC,
        process.env.ROLE_RECRUIT,
      ].filter(Boolean);

      if (baseRoles.length > 0) {
        await member.roles.add(baseRoles);
      }

      // เมนูเลือกเวลา
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("md_time")
          .setPlaceholder("เลือกเวลาเวร (เลือกได้ 1)")
          .addOptions(
            { label: "🕛 12.00", value: "TIME_12" },
            { label: "🕒 15.00", value: "TIME_15" },
            { label: "🕕 18.00", value: "TIME_18" },
            { label: "🕘 21.00", value: "TIME_21" },
            { label: "🕛 00.00", value: "TIME_00" }
          )
      );

      return interaction.reply({
        content: "เลือกเวลาเวรของคุณ",
        components: [row],
        ephemeral: true,
      });
    }

    /* ---------- SELECT TIME ---------- */
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId !== "md_time") return;

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const key = interaction.values[0];

      const timeRoles = {
        TIME_12: process.env.ROLE_TIME_12,
        TIME_15: process.env.ROLE_TIME_15,
        TIME_18: process.env.ROLE_TIME_18,
        TIME_21: process.env.ROLE_TIME_21,
        TIME_00: process.env.ROLE_TIME_00,
      };

      const timeRole = timeRoles[key];
      if (!timeRole) {
        return interaction.reply({ content: "❌ ไม่พบยศเวลา", ephemeral: true });
      }

      // ลบเวลาเก่า
      await member.roles.remove(Object.values(timeRoles)).catch(() => {});
      await member.roles.add(timeRole);

      /* ---------- LOG ---------- */
      const logChannel = interaction.guild.channels.cache.get(
        process.env.LOG_CHANNEL_ID
      );

      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor(0x2f9bff)
          .setTitle("🛡️ MD SPACE – REGISTER LOG")
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            { name: "Discord", value: interaction.user.tag, inline: true },
            { name: "User ID", value: interaction.user.id, inline: true },
            { name: "Name IC", value: member.displayName },
            { name: "Work Time", value: key.replace("TIME_", "") + ".00" }
          )
          .setFooter({ text: "MD Space System" })
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      }

      return interaction.update({
        content: "✅ ตั้งค่าเรียบร้อย",
        components: [],
      });
    }
  } catch (err) {
    console.error(err);
    if (!interaction.replied) {
      interaction.reply({ content: "❌ เกิดข้อผิดพลาด", ephemeral: true }).catch(() => {});
    }
  }
});

/* ===================== LOGIN ===================== */

client.login(process.env.TOKEN);
