"""
Parse Guild Wars Reforged skill template codes

See https://wiki.guildwars.com/wiki/Skill_template_format for reference and
profession/attribute/skill indexes.
"""

# stdlib
from dataclasses import dataclass
from typing import Any, Generator


PROFESSIONS: list[str]
"""Professions; file is one profession per line, in order"""

ATTRIBUTES: list[str]
"""Attributes; file is one attribute per line, in order"""

SKILLS: dict[int, str]
"""Skills; file is one skill per line, ID -> Tab -> Skill name"""


@dataclass
class GuildWarsSkillTemplate:

    """Skill template data"""

    primary_profession: str
    secondary_profession: str
    attributes: dict[str, int]
    skills: list[str]

    def print(self) -> None:
        """Output template data."""

        print(f"{self.primary_profession} / {self.secondary_profession}")
        print("Attributes:")

        for attribute, score in self.attributes.items():
            print(f"- {attribute}: {score}")

        print("Skills:")

        for skill in self.skills:
            print(f"- {skill}")


def iterate_file(prefix: str) -> Generator[str, Any, None]:
    """Generator for reading files."""

    with open(f"{prefix}.txt") as f:
        for l in f.readlines():
            item = l.strip()

            # skip empty lines
            if not len(item):
                continue

            yield item


def load_array(prefix: str) -> list[str]:
    """Load array from file."""

    result: list[int] = []

    for line in iterate_file(prefix):
        result.append(line)

    return result


def load_sparse_array(prefix: str) -> dict[int, str]:
    """Load sparse array from file."""

    result: dict[int, str] = {}

    for line in iterate_file(prefix):
        identifier, item = line.split("\t")
        result[int(identifier)] = item

    return result


def decode(code: str) -> list[int]:
    """Base64 decode skill template code."""

    CHAR_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    decoded = []

    for c in code:
        decoded.append(CHAR_MAP.index(c))

    return decoded


def extract(bits: list[int], number: int) -> int:
    """Extract bits from skill template array."""

    sliced = bits[:number]
    sliced.reverse()

    for _ in range(number):
        bits.pop(0)

    result = int("".join([str(b) for b in sliced]), 2)

    return result


def load_template(code: str) -> GuildWarsSkillTemplate:
    """Load skill template for provided code."""

    decoded = decode(code)
    bits = []

    for d in decoded:
        bits.extend([int(b) for b in "{0:06b}".format(d)][::-1])

    template_type = extract(bits, 4)

    if template_type != 14:
        raise TypeError("Wrong template type")

    template_version = extract(bits, 4)

    if template_version != 0:
        raise TypeError("Wrong template version")

    profession_bits = extract(bits, 2) * 2 + 4

    try:
        primary_profession = PROFESSIONS[extract(bits, profession_bits)]
        secondary_profession = PROFESSIONS[extract(bits, profession_bits)]
    except IndexError:
        raise ValueError("Invalid profession")

    number_attributes = extract(bits, 4)
    attribute_bits = extract(bits, 4) + 4
    attributes: dict[str, int] = dict()
    
    try:
        for _ in range(number_attributes):
            attribute = ATTRIBUTES[extract(bits, attribute_bits)]
            score = extract(bits, 4)
            attributes[attribute] = score
    except IndexError:
        raise ValueError("Invalid attribute")

    skill_bits = extract(bits, 4) + 8
    skills = []

    try:
        for _ in range(8):
            skill_id = extract(bits, skill_bits)
            skills.append(SKILLS[skill_id])
    except IndexError:
        raise ValueError("Invalid skill ID")

    return GuildWarsSkillTemplate(
        primary_profession=primary_profession,
        secondary_profession=secondary_profession,
        attributes=attributes,
        skills=skills,
    )

PROFESSIONS = load_array("professions")
ATTRIBUTES = load_array("attributes")
SKILLS = load_sparse_array("skills")

template = load_template("OQkSE5JPlN+aibpAWMKdlPM")
template.print()