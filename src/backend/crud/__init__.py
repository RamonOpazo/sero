from backend.db.models import Project, Document, File, Prompt, Selection
from backend.crud import projects, documents, files, prompts, selections


projects_crud = projects.ProjectCrud(Project)
documents_crud = documents.DocumentCrud(Document)
files_crud = files.FileCrud(File)
prompts_crud = prompts.PromptCrud(Prompt)
selections_crud = selections.SelectionCrud(Selection)
