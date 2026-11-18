import type { Dispatch, SetStateAction } from "react";

import type {
  CropRegion,
  EditorLayer,
  PresetName,
} from "../types/editor";

import type { SavedProject } from "../services/projectStorage";

import {
  saveProject,
  getAllProjects,
  getProject,
  deleteProject,
} from "../services/projectStorage";

import {
  imageToDataURL,
  dataURLToImage,
} from "../utils/imageUtils";

type ProjectManagementOptions = {
  imageRef: { current: HTMLImageElement | null };
  originalImageRef: { current: HTMLImageElement | null };

  imageName: string;
  projectName: string;

  layers: EditorLayer[];
  selectedLayerId: string | null;
  cropRegion: CropRegion | null;

  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  activePreset: PresetName;

  selectedProjectId: string;

  setOriginalImageDimensions: Dispatch<
    SetStateAction<{ width: number; height: number } | null>
  >;
  setResizeWidth: Dispatch<SetStateAction<number>>;
  setResizeHeight: Dispatch<SetStateAction<number>>;

  setImageName: Dispatch<SetStateAction<string>>;
  setProjectName: Dispatch<SetStateAction<string>>;

  setCropRegion: Dispatch<SetStateAction<CropRegion | null>>;
  setBrightness: Dispatch<SetStateAction<number>>;
  setContrast: Dispatch<SetStateAction<number>>;
  setSaturation: Dispatch<SetStateAction<number>>;
  setBlur: Dispatch<SetStateAction<number>>;
  setActivePreset: Dispatch<SetStateAction<PresetName>>;

  setLayers: Dispatch<SetStateAction<EditorLayer[]>>;
  setSelectedLayerId: Dispatch<SetStateAction<string | null>>;

  setSavedProjects: Dispatch<SetStateAction<SavedProject[]>>;
  setSelectedProjectId: Dispatch<SetStateAction<string>>;

  setImageRevision: Dispatch<SetStateAction<number>>;
  setIsSavingProject: Dispatch<SetStateAction<boolean>>;
};

export function useProjectManagement({
  imageRef,
  originalImageRef,

  imageName,
  projectName,

  layers,
  selectedLayerId,
  cropRegion,

  brightness,
  contrast,
  saturation,
  blur,
  activePreset,

  selectedProjectId,

  setOriginalImageDimensions,
  setResizeWidth,
  setResizeHeight,

  setImageName,
  setProjectName,

  setCropRegion,
  setBrightness,
  setContrast,
  setSaturation,
  setBlur,
  setActivePreset,

  setLayers,
  setSelectedLayerId,

  setSavedProjects,
  setSelectedProjectId,

  setImageRevision,
  setIsSavingProject,
}: ProjectManagementOptions) {

  const handleSaveProject = async () => {
    const currentImage = imageRef.current;
    const originalImage = originalImageRef.current;

    if (!currentImage || !originalImage) {
      alert("Please upload an image before saving.");
      return;
    }

    const name =
      projectName.trim() || imageName || "Untitled Project";

    try {
      setIsSavingProject(true);

      const savedLayers = layers.map((layer) => ({
        ...layer,
        image: layer.image
          ? imageToDataURL(layer.image)
          : undefined,
      }));

      const project: SavedProject = {
        id: crypto.randomUUID(),
        name,
        imageName,
        currentImage: imageToDataURL(currentImage),
        originalImage: imageToDataURL(originalImage),
        cropRegion: cropRegion ? { ...cropRegion } : null,
        brightness,
        contrast,
        saturation,
        blur,
        activePreset,
        layers: savedLayers,
        selectedLayerId,
        updatedAt: Date.now(),
      };

      await saveProject(project);

      const projects = await getAllProjects();

      setSavedProjects(projects);
      setSelectedProjectId(project.id);

      alert("Project saved successfully!");
    } catch (error) {
      console.error("Project saving failed:", error);
      alert("Unable to save project. Please try again.");
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleOpenProject = async (id: string) => {
    try {
      const project = await getProject(id);

      if (!project) {
        alert("Project not found.");
        return;
      }

      const currentImage = await dataURLToImage(
        project.currentImage
      );

      const originalImage = await dataURLToImage(
        project.originalImage
      );

      const restoredLayers = await Promise.all(
        project.layers.map(async (savedLayer) => {
          const layer = savedLayer as EditorLayer & {
            image?: string;
          };

          return {
            ...layer,
            image: layer.image
              ? await dataURLToImage(layer.image)
              : undefined,
          } as EditorLayer;
        })
      );

      imageRef.current = currentImage;

      setOriginalImageDimensions({
        width: currentImage.width,
        height: currentImage.height,
      });

      setResizeWidth(currentImage.width);
      setResizeHeight(currentImage.height);

      originalImageRef.current = originalImage;

      setImageName(project.imageName);
      setProjectName(project.name);

      setCropRegion(project.cropRegion);

      setBrightness(project.brightness);
      setContrast(project.contrast);
      setSaturation(project.saturation);
      setBlur(project.blur);

      setActivePreset(project.activePreset as PresetName);

      setLayers(restoredLayers);
      setSelectedLayerId(project.selectedLayerId);

      setSelectedProjectId(project.id);

      setImageRevision((previous) => previous + 1);

      alert("Project opened successfully!");
    } catch (error) {
      console.error("Project opening failed:", error);
      alert("Unable to open project.");
    }
  };

  const handleDeleteProject = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project?"
    );

    if (!confirmed) return;

    try {
      await deleteProject(id);

      const projects = await getAllProjects();

      setSavedProjects(projects);

      if (selectedProjectId === id) {
        setSelectedProjectId("");
      }

      alert("Project deleted successfully!");
    } catch (error) {
      console.error("Project deletion failed:", error);
      alert("Unable to delete project.");
    }
  };

  return {
    handleSaveProject,
    handleOpenProject,
    handleDeleteProject,
  };
}