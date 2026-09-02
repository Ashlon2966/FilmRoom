import { parse } from 'fountain-js';

/**
 * Parses raw screenplay text into structured script elements.
 * @param {string} rawFountainText - Plain text screenplay script.
 * @returns {Array} Array of tokenized objects: { type, text }
 */
export const parseScreenplay = (rawFountainText) => {
  if (!rawFountainText) return [];

  try {
    const output = parse(rawFountainText);
    // output.tokens contains structured elements:
    // 'scene_heading', 'action', 'character', 'dialogue', 'parenthetical'
    return output.tokens || [];
  } catch (error) {
    console.error('Fountain parsing error:', error);
    return [];
  }
};

/**
 * Extracts dialogue cues exclusively for a specific character (Actor Sides).
 * @param {string} rawFountainText - Full script.
 * @param {string} characterName - The name of the actor's character (e.g. "JOHN").
 * @returns {Array} List of scenes and lines assigned to that character.
 */
export const getActorSides = (rawFountainText, characterName) => {
  const tokens = parseScreenplay(rawFountainText);
  const characterUpper = characterName.trim().toUpperCase();
  const sides = [];

  let currentScene = 'UNKNOWN SCENE';
  let isTargetCharacter = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'scene_heading') {
      currentScene = token.text;
    }

    if (token.type === 'character') {
      isTargetCharacter = token.text.toUpperCase().includes(characterUpper);
    }

    if (isTargetCharacter && token.type === 'dialogue') {
      sides.push({
        scene: currentScene,
        character: characterUpper,
        line: token.text,
      });
      isTargetCharacter = false; // Reset after dialogue block
    }
  }

  return sides;
};
