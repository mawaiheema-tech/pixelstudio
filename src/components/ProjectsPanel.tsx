
import type { SavedProject } from "../services/projectStorage";

type ProjectsPanelProps = {
  savedProjects: SavedProject[];
  handleOpenProject: (id: string) => void;
  handleDeleteProject: (id: string) => void;
};

function ProjectsPanel({
  savedProjects,
  handleOpenProject,
  handleDeleteProject,
}: ProjectsPanelProps) {
  return (
    <div className="projects-panel">
      <div className="layers-heading">
        <h4>Saved Projects ({savedProjects.length})</h4>
      </div>

      {savedProjects.length === 0 ? (
        <div className="empty-panel">
          <p>No saved projects yet</p>
          <span>Save your first project to see it here.</span>
        </div>
      ) : (
        <div className="saved-project-list">
          {savedProjects.map((project) => (
            <div className="saved-project-item" key={project.id}>
              <div>
                <strong>{project.name}</strong>
                <span>{project.imageName}</span>

                <button
                  className="export-button"
                  onClick={() => handleOpenProject(project.id)}
                >
                  Open Project
                </button>

                <button
                  className="export-button"
                  onClick={() => handleDeleteProject(project.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectsPanel;
