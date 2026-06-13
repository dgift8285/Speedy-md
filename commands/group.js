import { downloadMediaMessage } from '@whiskeysockets/baileys';

export const name = [
  'groupjid', 'gcdesc', 'groupname', 'demoteall',
  'gcpic', 'kickall', 'hidetag', 'gpp', 'tagall',
  'opentime', 'closetime', 'disap-off', 'disap1',
  'disap7', 'disap90', 'revoke', 'grouplink',
  'approveall', 'add', 'delete', 'poll', 'open',
  'close', 'kick', 'promote', 'demote', 'togroupstatus'
];

export const category = 'Group';
export const description = 'Group management commands';

export async function execute({ sock, msg, from, args, isGroup, isBotAdmin, isAdmin, groupMetadata, sender, PREFIX, commandName }) {
  try {

    // ─── GROUPJID ───
    if (commandName === 'groupjid') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      return await sock.sendMessage(from, {
        text: `🔗 *Group JID:*\n\`\`\`${from}\`\`\`\n\n_Powered by SpeedyMD_ ⚡`
      }, { quoted: msg });
    }

    // ─── GCDESC ───
    if (commandName === 'gcdesc') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const desc = args.join(' ');
      if (!desc) return await sock.sendMessage(from, { text: `❌ *Usage: ${PREFIX}gcdesc New description*` }, { quoted: msg });
      await sock.groupUpdateDescription(from, desc);
      return await sock.sendMessage(from, {
        text: `✅ *Group description updated!*\n\n📝 ${desc}`
      }, { quoted: msg });
    }

    // ─── GROUPNAME ───
    if (commandName === 'groupname') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const newName = args.join(' ');
      if (!newName) return await sock.sendMessage(from, { text: `❌ *Usage: ${PREFIX}groupname New Name*` }, { quoted: msg });
      await sock.groupUpdateSubject(from, newName);
      return await sock.sendMessage(from, {
        text: `✅ *Group name updated to:* ${newName}`
      }, { quoted: msg });
    }

    // ─── GCPIC ───
    if (commandName === 'gcpic') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const quotedMsg = contextInfo?.quotedMessage;
      const imageMessage = quotedMsg?.imageMessage || null;
      if (!imageMessage) return await sock.sendMessage(from, { text: '❌ *Reply to an image!*' }, { quoted: msg });
      const buffer = await downloadMediaMessage(
        {
          key: { remoteJid: from, id: contextInfo.stanzaId, fromMe: false, participant: contextInfo.participant },
          message: { imageMessage }
        },
        'buffer', {},
        {
          logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
          reuploadRequest: sock.updateMediaMessage
        }
      );
      await sock.updateProfilePicture(from, buffer);
      return await sock.sendMessage(from, { text: '✅ *Group picture updated!*' }, { quoted: msg });
    }

    // ─── GPP ───
    if (commandName === 'gpp') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      try {
        const url = await sock.profilePictureUrl(from, 'image');
        const https = await import('https');
        const buffer = await new Promise((resolve, reject) => {
          https.default.get(url, res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
          }).on('error', reject);
        });
        return await sock.sendMessage(from, {
          image: buffer,
          caption: `🖼️ *Group Profile Picture*\n\n📌 _${groupMetadata?.subject || 'Group'}_\n\n_Powered by SpeedyMD_ ⚡`
        }, { quoted: msg });
      } catch {
        return await sock.sendMessage(from, { text: '❌ *No group picture found!*' }, { quoted: msg });
      }
    }

    // ─── OPEN ───
    if (commandName === 'open') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      await sock.groupSettingUpdate(from, 'not_announcement');
      return await sock.sendMessage(from, {
        text: '✅ *Group Opened!*\n\n🔓 All members can now send messages.'
      }, { quoted: msg });
    }

    // ─── CLOSE ───
    if (commandName === 'close') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      await sock.groupSettingUpdate(from, 'announcement');
      return await sock.sendMessage(from, {
        text: '✅ *Group Closed!*\n\n🔒 Only admins can send messages.'
      }, { quoted: msg });
    }

    // ─── KICK ───
    if (commandName === 'kick') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      let target = contextInfo?.participant || contextInfo?.mentionedJid?.[0] || null;
      if (!target && args[0]) {
        const num = args[0].replace(/[^0-9]/g, '');
        if (num.length > 5) target = num + '@s.whatsapp.net';
      }
      if (!target) return await sock.sendMessage(from, {
        text: `❌ *Usage:*\n▸ Reply to message + ${PREFIX}kick\n▸ ${PREFIX}kick @member\n▸ ${PREFIX}kick 254xxxxxxx`
      }, { quoted: msg });
      if (!target.includes('@')) target += '@s.whatsapp.net';
      const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      if (target === botJid) return await sock.sendMessage(from, { text: '❌ *Cannot kick myself!*' }, { quoted: msg });
      const targetP = groupMetadata?.participants?.find(p => p.id === target || p.id.split(':')[0] + '@s.whatsapp.net' === target);
      if (targetP?.admin) return await sock.sendMessage(from, { text: '❌ *Cannot kick an admin!*\n\nDemote them first.' }, { quoted: msg });
      if (!targetP) return await sock.sendMessage(from, { text: '❌ *That person is not in this group!*' }, { quoted: msg });
      await sock.groupParticipantsUpdate(from, [target], 'remove');
      return await sock.sendMessage(from, {
        text: `✅ *Kicked!*\n👤 @${target.split('@')[0]}\n\n_Powered by SpeedyMD_ ⚡`,
        mentions: [target]
      }, { quoted: msg });
    }

    // ─── PROMOTE ───
    if (commandName === 'promote') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      let target = contextInfo?.participant || contextInfo?.mentionedJid?.[0] || null;
      if (!target && args[0]) {
        const num = args[0].replace(/[^0-9]/g, '');
        if (num.length > 5) target = num + '@s.whatsapp.net';
      }
      if (!target) return await sock.sendMessage(from, {
        text: `❌ *Usage:*\n▸ Reply to message + ${PREFIX}promote\n▸ ${PREFIX}promote @member`
      }, { quoted: msg });
      if (!target.includes('@')) target += '@s.whatsapp.net';
      await sock.groupParticipantsUpdate(from, [target], 'promote');
      return await sock.sendMessage(from, {
        text: `✅ *Promoted to Admin!*\n👑 @${target.split('@')[0]}\n\n_Powered by SpeedyMD_ ⚡`,
        mentions: [target]
      }, { quoted: msg });
    }

    // ─── DEMOTE ───
    if (commandName === 'demote') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      let target = contextInfo?.participant || contextInfo?.mentionedJid?.[0] || null;
      if (!target && args[0]) {
        const num = args[0].replace(/[^0-9]/g, '');
        if (num.length > 5) target = num + '@s.whatsapp.net';
      }
      if (!target) return await sock.sendMessage(from, {
        text: `❌ *Usage:*\n▸ Reply to message + ${PREFIX}demote\n▸ ${PREFIX}demote @member`
      }, { quoted: msg });
      if (!target.includes('@')) target += '@s.whatsapp.net';
      await sock.groupParticipantsUpdate(from, [target], 'demote');
      return await sock.sendMessage(from, {
        text: `✅ *Demoted from Admin!*\n👤 @${target.split('@')[0]}\n\n_Powered by SpeedyMD_ ⚡`,
        mentions: [target]
      }, { quoted: msg });
    }

    // ─── DEMOTEALL ───
    if (commandName === 'demoteall') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const senderClean = sender?.split(':')[0] + '@s.whatsapp.net';
      const admins = groupMetadata?.participants
        ?.filter(p => p.admin && p.id !== botJid && p.id !== senderClean)
        ?.map(p => p.id) || [];
      if (admins.length === 0) return await sock.sendMessage(from, { text: '❌ *No admins to demote!*' }, { quoted: msg });
      await sock.groupParticipantsUpdate(from, admins, 'demote');
      return await sock.sendMessage(from, {
        text: `✅ *Demoted ${admins.length} admins!*\n\n_Powered by SpeedyMD_ ⚡`
      }, { quoted: msg });
    }

    // ─── KICKALL ───
    if (commandName === 'kickall') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const senderClean = sender?.split(':')[0] + '@s.whatsapp.net';
      const members = groupMetadata?.participants
        ?.filter(p => !p.admin && p.id !== botJid && p.id !== senderClean)
        ?.map(p => p.id) || [];
      if (members.length === 0) return await sock.sendMessage(from, { text: '❌ *No members to kick!*' }, { quoted: msg });
      await sock.sendMessage(from, { text: `⏳ *Kicking ${members.length} members...*` }, { quoted: msg });
      for (const member of members) {
        try {
          await sock.groupParticipantsUpdate(from, [member], 'remove');
          await new Promise(r => setTimeout(r, 500));
        } catch {}
      }
      return await sock.sendMessage(from, {
        text: `✅ *Kicked ${members.length} members!*\n\n_Powered by SpeedyMD_ ⚡`
      }, { quoted: msg });
    }

    // ─── HIDETAG ───
    if (commandName === 'hidetag') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      const text = args.join(' ') || '📢 Hidden announcement!';
      const mentions = groupMetadata?.participants?.map(p => p.id) || [];
      return await sock.sendMessage(from, { text, mentions }, { quoted: msg });
    }

    // ─── TAGALL ───
    if (commandName === 'tagall') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      const customMsg = args.join(' ') || '👋 Attention everyone!';
      const mentions = groupMetadata?.participants?.map(p => p.id) || [];
      let tagText = `📢 *${customMsg}*\n\n`;
      mentions.forEach(m => { tagText += `▸ @${m.split('@')[0]}\n`; });
      tagText += `\n_Powered by SpeedyMD_ ⚡`;
      return await sock.sendMessage(from, { text: tagText, mentions }, { quoted: msg });
    }

    // ─── GROUPLINK ───
    if (commandName === 'grouplink') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const code = await sock.groupInviteCode(from);
      return await sock.sendMessage(from, {
        text: `🔗 *Group Invite Link:*\nhttps://chat.whatsapp.com/${code}\n\n_Powered by SpeedyMD_ ⚡`
      }, { quoted: msg });
    }

    // ─── REVOKE ───
    if (commandName === 'revoke') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      await sock.groupRevokeInvite(from);
      return await sock.sendMessage(from, {
        text: '✅ *Group link revoked!*\n\nOld link no longer works.'
      }, { quoted: msg });
    }

    // ─── ADD ───
    if (commandName === 'add') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      if (!args[0]) return await sock.sendMessage(from, { text: `❌ *Usage: ${PREFIX}add 254xxxxxxx*` }, { quoted: msg });
      const num = args[0].replace(/[^0-9]/g, '');
      if (!num || num.length < 5) return await sock.sendMessage(from, { text: '❌ *Invalid number!*' }, { quoted: msg });
      const target = num + '@s.whatsapp.net';
      try {
        await sock.groupParticipantsUpdate(from, [target], 'add');
        return await sock.sendMessage(from, {
          text: `✅ *Added!*\n👤 @${num}\n\n_Powered by SpeedyMD_ ⚡`,
          mentions: [target]
        }, { quoted: msg });
      } catch (err) {
        return await sock.sendMessage(from, {
          text: `❌ *Could not add!*\n\n_${err.message}_`
        }, { quoted: msg });
      }
    }

    // ─── DELETE ───
    if (commandName === 'delete') {
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      if (!contextInfo?.stanzaId) return await sock.sendMessage(from, { text: '❌ *Reply to a message to delete it!*' }, { quoted: msg });
      try {
        await sock.sendMessage(from, {
          delete: {
            remoteJid: from,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant,
            fromMe: false,
          }
        });
        return await sock.sendMessage(from, { text: '✅ *Message deleted!*' }, { quoted: msg });
      } catch (err) {
        return await sock.sendMessage(from, { text: `❌ *Could not delete!*\n\n_${err.message}_` }, { quoted: msg });
      }
    }

    // ─── POLL ───
    if (commandName === 'poll') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      const text = args.join(' ');
      if (!text) return await sock.sendMessage(from, {
        text: `❌ *Usage:*\n${PREFIX}poll Question | Option1 | Option2`
      }, { quoted: msg });
      const parts = text.split('|').map(s => s.trim());
      if (parts.length < 3) return await sock.sendMessage(from, {
        text: `❌ *Need at least 2 options!*\n\n${PREFIX}poll Question | Option1 | Option2`
      }, { quoted: msg });
      const question = parts[0];
      const options = parts.slice(1);
      await sock.sendMessage(from, {
        poll: { name: question, values: options, selectableCount: 1 }
      });
      return;
    }

    // ─── APPROVEALL ───
    if (commandName === 'approveall') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      try {
        const requests = await sock.groupRequestParticipantsList(from);
        if (!requests || requests.length === 0) {
          return await sock.sendMessage(from, { text: '❌ *No pending requests!*' }, { quoted: msg });
        }
        await sock.groupRequestParticipantsUpdate(from, requests.map(r => r.jid), 'approve');
        return await sock.sendMessage(from, {
          text: `✅ *Approved ${requests.length} join requests!*\n\n_Powered by SpeedyMD_ ⚡`
        }, { quoted: msg });
      } catch {
        return await sock.sendMessage(from, {
          text: '❌ *Could not get requests!*\n\nMake sure group has approval mode on.'
        }, { quoted: msg });
      }
    }

    // ─── OPENTIME ───
    if (commandName === 'opentime') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const time = args[0];
      if (!time) return await sock.sendMessage(from, { text: `❌ *Usage: ${PREFIX}opentime 08:00*` }, { quoted: msg });
      await sock.groupSettingUpdate(from, 'not_announcement');
      return await sock.sendMessage(from, {
        text: `✅ *Group opened at ${time}!*\n🔓 All members can send messages.`
      }, { quoted: msg });
    }

    // ─── CLOSETIME ───
    if (commandName === 'closetime') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      if (!isBotAdmin) return await sock.sendMessage(from, { text: '❌ *Make bot admin first!*' }, { quoted: msg });
      const time = args[0];
      if (!time) return await sock.sendMessage(from, { text: `❌ *Usage: ${PREFIX}closetime 22:00*` }, { quoted: msg });
      await sock.groupSettingUpdate(from, 'announcement');
      return await sock.sendMessage(from, {
        text: `✅ *Group closed at ${time}!*\n🔒 Only admins can send messages.`
      }, { quoted: msg });
    }

    // ─── DISAP-OFF ───
    if (commandName === 'disap-off') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      await sock.groupToggleEphemeral(from, 0);
      return await sock.sendMessage(from, {
        text: '✅ *Disappearing messages turned OFF!*'
      }, { quoted: msg });
    }

    // ─── DISAP1 ───
    if (commandName === 'disap1') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      await sock.groupToggleEphemeral(from, 86400);
      return await sock.sendMessage(from, {
        text: '✅ *Disappearing messages set to 1 day!*'
      }, { quoted: msg });
    }

    // ─── DISAP7 ───
    if (commandName === 'disap7') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      await sock.groupToggleEphemeral(from, 604800);
      return await sock.sendMessage(from, {
        text: '✅ *Disappearing messages set to 7 days!*'
      }, { quoted: msg });
    }

    // ─── DISAP90 ───
    if (commandName === 'disap90') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      await sock.groupToggleEphemeral(from, 7776000);
      return await sock.sendMessage(from, {
        text: '✅ *Disappearing messages set to 90 days!*'
      }, { quoted: msg });
    }

    // ─── TOGROUPSTATUS ───
    if (commandName === 'togroupstatus') {
      if (!isGroup) return await sock.sendMessage(from, { text: '❌ *Only works in groups!*' }, { quoted: msg });
      if (!isAdmin) return await sock.sendMessage(from, { text: '❌ *Admins only!*' }, { quoted: msg });
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const quotedMsg = contextInfo?.quotedMessage;
      if (!quotedMsg) return await sock.sendMessage(from, { text: '❌ *Reply to a message!*' }, { quoted: msg });
      const text = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || '';
      if (!text) return await sock.sendMessage(from, { text: '❌ *Only text messages supported!*' }, { quoted: msg });
      await sock.sendMessage('status@broadcast', { text });
      return await sock.sendMessage(from, { text: '✅ *Posted to status!*' }, { quoted: msg });
    }

  } catch (err) {
    console.error(`❌ Group command error [${commandName}]:`, err.message);
    await sock.sendMessage(from, {
      text: `❌ *Command failed!*\n\n_${err.message}_`
    }, { quoted: msg });
  }
}