# Privacy Policy — GW Discord Builds

_Last updated: 2026-06-03_

This document explains what data the **GW Discord Builds** bot ("the bot")
collects, why, and how you can have it removed. It applies to any instance
of the bot, including any public hosted instance run by the maintainers and
any self-hosted instance you run yourself.

## 1. Data we store

When you use the bot's save / load features (`/build name:…`, `/teambuild
name:…`, the `/teambuilder` flow), the following data is written to the
instance's MySQL database:

| Field            | Why                                                |
|------------------|----------------------------------------------------|
| Discord guild ID | To scope saved builds to the server they belong to |
| Discord user ID  | To attribute saves and to support private builds   |
| Build name       | So you can recall it with `/load` / `/loadteam`    |
| Template code(s) | The Guild Wars 1 build template you provided       |
| Timestamps       | Created / last-updated, for housekeeping           |

If you never use a save feature, the bot stores **no data about you**.

## 2. What we do **not** collect

* Message content (the bot does not request the Message Content intent).
* Direct messages, voice activity, presence, or member lists.
* Any analytics, tracking pixels, advertising identifiers, or third-party
  trackers.
* IP addresses or device information beyond what Discord transmits as part
  of the gateway connection.

## 3. Third-party data sources

To render a build, the bot fetches skill descriptions, attributes, and
icons from the public **[Guild Wars Wiki](https://wiki.guildwars.com)**.
That request contains no information about you — only the skill ID.
Cached results are stored locally on the bot host (the `cache/` folder)
and never associated with users.

## 4. Retention & deletion

Saved builds persist until they are deleted (overwritten by saving a build
with the same name, or removed by an instance operator). Builds you save
as `private:true` are visible only to you within the guild where they were
saved.

To request deletion of all data associated with you on a given instance,
contact the operator of that instance:

* **Public hosted instance:** open an issue on the project's GitHub or use
  the contact link in the bot's profile.
* **Self-hosted instances:** contact the server administrator who invited
  the bot.

If you remove the bot from your Discord server, the data tied to that
server remains in the database of the instance you were using until the
operator deletes it on request.

## 5. Children

The bot is not directed at children under 13 and complies with Discord's
[Terms of Service](https://discord.com/terms), which requires users to be
at least 13 years old (or older where local law requires).

## 6. Changes

This policy may change as the bot evolves. Material changes will be noted
in the project changelog and the "Last updated" date above.

## 7. Contact

Open an issue at <https://github.com/taitai42/gwdiscordbuilds> for any
privacy-related question.
