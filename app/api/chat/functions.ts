import { CompletionCreateParams } from "openai/resources/chat/index";

// Assuming FunctionParams is the structure of a function in CompletionCreateParams
interface FunctionParams {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

export const functions: FunctionParams[] = [
  {
    name: "get_top_stories",
    description:
      "Get the top stories from Hacker News. Also returns the Hacker News URL to each story.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "The number of stories to return. Defaults to 10.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_story",
    description:
      "Get a story from Hacker News. Also returns the Hacker News URL to the story.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "The ID of the story",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "get_story_with_comments",
    description:
      "Get a story from Hacker News with comments.  Also returns the Hacker News URL to the story and each comment.",
    parameters: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "The ID of the story",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "evaluate_script",
    description:
      "Evaluate a script or code and provide a quality assessment.",
    parameters: {
      type: "object",
      properties: {
        script: {
          type: "string",
          description: "The script or code to evaluate",
        },
      },
      required: ["script"],
    },
  },
  {
    name: "convert_to_roman",
    description:
      "Convert an Arabic numeral to a Roman numeral.",
    parameters: {
      type: "object",
      properties: {
        number: {
          type: "number",
          description: "The Arabic numeral to convert",
        },
      },
      required: ["number"],
    },
  },
  {
    name: "calculate_factorial",
    description:
      "Calculate the factorial of a number.",
    parameters: {
      type: "object",
      properties: {
        number: {
          type: "number",
          description: "The number to calculate factorial for",
        },
      },
      required: ["number"],
    },
  },
];

// Fungsi-fungsi tambahan di bawah ini

async function evaluate_script(script: string) {
  try {
    const result = eval(script);
    return result;
  } catch (error) {
    return `Error: ${error}`;
  }
}

async function convert_to_roman(number: number) {
  const romanNumerals = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" },
  ];

  let result = "";
  for (const numeral of romanNumerals) {
    while (number >= numeral.value) {
      result += numeral.numeral;
      number -= numeral.value;
    }
  }
  return result;
}

async function calculate_factorial(number: number) {
  if (number === 0) {
    return 1;
  } else {
    let factorial = 1;
    for (let i = 1; i <= number; i++) {
      factorial *= i;
    }
    return factorial;
  }
}

// Fungsi-fungsi yang sudah ada tetap ada di bawah ini

async function get_top_stories(limit: number = 10) {
  const response = await fetch(
    "https://hacker-news.firebaseio.com/v0/topstories.json"
  );
  const ids = await response.json();
  const stories = await Promise.all(
    ids.slice(0, limit).map((id: number) => get_story(id))
  );
  return stories;
}

async function get_story(id: number) {
  const response = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${id}.json`
  );
  const data = await response.json();
  return {
    ...data,
    hnUrl: `https://news.ycombinator.com/item?id=${id}`,
  };
}

async function get_story_with_comments(id: number) {
  const response = await fetch(
    `https://hacker-news.firebaseio.com/v0/item/${id}.json`
  );
  const data = await response.json();
  const comments = await Promise.all(
    data.kids.slice(0, 10).map((id: number) => get_story(id))
  );
  return {
    ...data,
    hnUrl: `https://news.ycombinator.com/item?id=${id}`,
    comments: comments.map((comment: any) => ({
      ...comment,
      hnUrl: `https://news.ycombinator.com/item?id=${comment.id}`,
    })),
  };
}

async function summarize_top_story() {
  const topStory = await get_top_stories(1);
  return await get_story_with_comments(topStory[0].id);
}

export async function runFunction(name: string, args: any) {
  switch (name) {
    case "get_top_stories":
      return await get_top_stories(args.limit);
    case "get_story":
      return await get_story(args.id);
    case "get_story_with_comments":
      return await get_story_with_comments(args.id);
    case "summarize_top_story":
      return await summarize_top_story();
    case "evaluate_script":
      return await evaluate_script(args.script);
    case "convert_to_roman":
      return await convert_to_roman(args.number);
    case "calculate_factorial":
      return await calculate_factorial(args.number);
    default:
      return null;
  }
}
