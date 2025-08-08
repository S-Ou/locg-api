import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "League of Comic Geeks API",
      version: "1.0.0",
      description:
        "API for scraping and retrieving comic information from League of Comic Geeks",
      contact: {
        name: "Samuel Ou",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1",
      },
    ],
    components: {
      schemas: {
        ComicData: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "Comic ID",
              example: 6731715,
            },
            title: {
              type: "string",
              description: "Comic title",
              example: "One World Under Doom #6",
            },
            publisher: {
              type: "string",
              description: "Comic publisher",
              example: "Marvel Comics",
            },
            date: {
              type: "string",
              format: "date-time",
              description: "Release date",
              example: "2024-12-18T00:00:00.000Z",
            },
            price: {
              type: "number",
              description: "Comic price in dollars",
              example: 3.99,
            },
            coverImage: {
              type: "string",
              description: "URL to cover image",
              example:
                "https://s3.amazonaws.com/comicgeeks/comics/covers/large-1234567.jpg",
            },
            url: {
              type: "string",
              description: "League of Comic Geeks URL",
              example: "/comic/6731715/one-world-under-doom-6",
            },
            pulls: {
              type: "number",
              description: "Number of pulls",
              example: 1250,
            },
            community: {
              type: "number",
              description: "Community rating",
              example: 85,
            },
            titlePath: {
              type: "string",
              description: "Title path slug from the comic URL",
              example: "one-world-under-doom-6",
            },
          },
        },
        Creator: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Creator name",
              example: "Ryan North",
            },
            role: {
              type: "string",
              description: "Creator role",
              example: "Writer",
            },
            url: {
              type: "string",
              description: "Creator profile URL",
              example: "/people/1234/ryan-north",
            },
          },
        },
        Character: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Character name",
              example: "Doctor Doom",
            },
            realName: {
              type: "string",
              description: "Character real name",
              example: "Victor Von Doom",
            },
            url: {
              type: "string",
              description: "Character profile URL",
              example: "/character/1234/doctor-doom",
            },
            type: {
              type: "string",
              description: "Character involvement type",
              example: "Main",
            },
          },
        },
        Variant: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "Variant ID",
              example: 6731716,
            },
            title: {
              type: "string",
              description: "Variant title",
              example: "One World Under Doom #6 (Variant Cover)",
            },
            coverImage: {
              type: "string",
              description: "Variant cover image URL",
              example:
                "https://s3.amazonaws.com/comicgeeks/comics/covers/large-1234568.jpg",
            },
            url: {
              type: "string",
              description: "Variant URL",
              example: "/comic/6731716/one-world-under-doom-6-variant",
            },
            category: {
              type: "string",
              description: "Variant category",
              example: "Incentive Covers",
            },
          },
        },
        Story: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Story title",
              example: "One World Under Doom",
            },
            type: {
              type: "string",
              description: "Story type",
              example: "Story",
            },
            pages: {
              type: "number",
              description: "Number of pages",
              example: 20,
            },
            creators: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Creator",
              },
            },
            characters: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Character",
              },
            },
          },
        },
        ComicDetails: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "Comic ID",
              example: 6731715,
            },
            title: {
              type: "string",
              description: "Comic title",
              example: "One World Under Doom #6",
            },
            issueNumber: {
              type: "string",
              description: "Issue number",
              example: "6",
            },
            publisher: {
              type: "string",
              description: "Publisher name",
              example: "Marvel Comics",
            },
            description: {
              type: "string",
              description: "Comic description",
              example: "The final issue of the epic storyline!",
            },
            coverDate: {
              type: "string",
              description: "Cover date",
              example: "December 2024",
            },
            releaseDate: {
              type: "string",
              format: "date-time",
              description: "Release date",
              example: "2024-12-18T00:00:00.000Z",
            },
            pages: {
              type: "number",
              description: "Number of pages",
              example: 20,
            },
            price: {
              type: "number",
              description: "Price in dollars",
              example: 3.99,
            },
            format: {
              type: "string",
              description: "Comic format",
              example: "Comic",
            },
            upc: {
              type: "string",
              description: "UPC code",
              example: "75960620426900611",
            },
            distributorSku: {
              type: "string",
              description: "Distributor SKU",
              example: "MAR240001",
            },
            finalOrderCutoff: {
              type: "string",
              description: "Final order cutoff date",
              example: "November 25, 2024",
            },
            coverImage: {
              type: "string",
              description: "Cover image URL",
              example:
                "https://s3.amazonaws.com/comicgeeks/comics/covers/large-1234567.jpg",
            },
            url: {
              type: "string",
              description: "League of Comic Geeks URL",
              example: "/comic/6731715/one-world-under-doom-6",
            },
            rating: {
              type: "number",
              description: "Average rating",
              example: 4.2,
            },
            ratingCount: {
              type: "number",
              description: "Number of ratings",
              example: 150,
            },
            ratingText: {
              type: "string",
              description: "Rating description",
              example: "Mostly Positive",
            },
            pulls: {
              type: "number",
              description: "Number of pulls",
              example: 1250,
            },
            collected: {
              type: "number",
              description: "Number collected",
              example: 800,
            },
            read: {
              type: "number",
              description: "Number read",
              example: 600,
            },
            wanted: {
              type: "number",
              description: "Number wanted",
              example: 300,
            },
            seriesUrl: {
              type: "string",
              description: "Series URL",
              example: "/series/12345/one-world-under-doom",
            },
            creators: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Creator",
              },
            },
            characters: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Character",
              },
            },
            variants: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Variant",
              },
            },
            stories: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Story",
              },
            },
            previousIssueUrl: {
              type: "string",
              description: "Previous issue URL",
              example: "/comic/6531715/one-world-under-doom-5",
            },
            nextIssueUrl: {
              type: "string",
              description: "Next issue URL",
              example: "/comic/6831715/one-world-under-doom-7",
            },
          },
        },
        ComicRequest: {
          type: "object",
          required: ["comicId", "title"],
          properties: {
            comicId: {
              type: "number",
              description: "The League of Comic Geeks comic ID (numeric)",
              example: 6731715,
            },
            title: {
              type: "string",
              description:
                "The League of Comic Geeks comic slug (title part of the URL)",
              example: "one-world-under-doom-6",
            },
          },
        },
        ComicError: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
              example: "Comic not found",
            },
            comicId: {
              type: "number",
              description: "The comic ID that failed",
              example: 6731715,
            },
            title: {
              type: "string",
              description: "The comic title that failed",
              example: "one-world-under-doom-6",
            },
            statusCode: {
              type: "number",
              description: "HTTP status code of the error",
              example: 404,
            },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
              example: "Invalid URL format",
            },
            expected: {
              type: "string",
              description: "Expected format (when applicable)",
              example: "https://leagueofcomicgeeks.com/comic/{id}/{slug}",
            },
            examples: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Usage examples",
            },
          },
        },
        HealthStatus: {
          type: "object",
          properties: {
            status: {
              type: "string",
              example: "ok",
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/**/*.ts"], // Path to the API files
};

const specs = swaggerJSDoc(options);

export function setupSwagger(app: Express): void {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      explorer: true,
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "League of Comic Geeks API Documentation",
    })
  );
}

export { specs };
