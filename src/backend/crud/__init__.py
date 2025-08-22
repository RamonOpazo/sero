from backend.db.models import Project, Document, File, Prompt, Selection, AiSettings
from backend.crud import projects, documents, files, prompts, selections, ai_settings, support


support_crud = support.SupportCrud()
projects_crud = projects.ProjectCrud(Project)
documents_crud = documents.DocumentCrud(Document)
files_crud = files.FileCrud(File)
prompts_crud = prompts.PromptCrud(Prompt)
selections_crud = selections.SelectionCrud(Selection)
ai_settings_crud = ai_settings.AiSettingsCrud(AiSettings)