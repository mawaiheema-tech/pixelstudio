import { openDB } from "idb";

const DB_NAME = "pixelstudio-db";
const STORE_NAME = "projects";

export const projectDB = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, {
        keyPath: "id",
      });
    }
  },
});

export type SavedProject = {
  id: string;
  name: string;
  imageName: string;
  currentImage: string;
  originalImage: string;
  cropRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  activePreset: string;
  layers: unknown[];
  selectedLayerId: string | null;
  updatedAt: number;
};

export async function saveProject(project: SavedProject) {
  const db = await projectDB;

  await db.put(STORE_NAME, project);
}

export async function getProject(id: string) {
  const db = await projectDB;

  return db.get(STORE_NAME, id) as Promise<SavedProject | undefined>;
}

export async function getAllProjects() {
  const db = await projectDB;

  return db.getAll(STORE_NAME) as Promise<SavedProject[]>;
}

export async function deleteProject(id: string) {
  const db = await projectDB;

  await db.delete(STORE_NAME, id);
}