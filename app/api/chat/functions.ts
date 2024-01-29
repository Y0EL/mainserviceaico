// functions.ts

type FunctionParameter = {
  limit?: number;
  id?: number;
};

type FunctionResponse = any; // Define a more specific type if needed

export const functions = [
  {
    name: "get_top_stories",
    description: "Get the top stories from Hacker News.",
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
  // ... other functions as previously defined
];

async function get_top_stories(limit = 10): Promise<FunctionResponse> {
  const response = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
  const ids: number[] = await response.json();
  const stories = await Promise.all(ids.slice(0, limit).map(get_story));
  return stories;
}

async function get_story(id: number): Promise<FunctionResponse> {
  const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
  const story = await response.json();
  return {
    ...story,
    hnUrl: `https://news.ycombinator.com/item?id=${id}`,
  };
}

async function get_story_with_comments(id: number): Promise<FunctionResponse> {
  const story = await get_story(id);
  const comments = await Promise.all(story.kids.slice(0, 10).map(get_story));
  return {
    ...story,
    comments: comments.map(comment => ({
      ...comment,
      hnUrl: `https://news.ycombinator.com/item?id=${comment.id}`,
    })),
  };
}

async function summarize_top_story(): Promise<FunctionResponse> {
  const topStory = await get_top_stories(1);
  return get_story_with_comments(topStory[0].id);
}

export async function runFunction(name: string, args: FunctionParameter): Promise<FunctionResponse> {
  switch (name) {
    case "get_top_stories":
      return get_top_stories(args.limit || 10); // Provide a default value if args.limit is undefined
    case "get_story":
      if (typeof args.id !== 'number') {
        throw new Error("Invalid or missing 'id' parameter for get_story");
      }
      return get_story(args.id);
    case "get_story_with_comments":
      if (typeof args.id !== 'number') {
        throw new Error("Invalid or missing 'id' parameter for get_story_with_comments");
      }
      return get_story_with_comments(args.id);
    case "summarize_top_story":
      return summarize_top_story();
    default:
      throw new Error(`Function ${name} is not implemented`);
  }
}

