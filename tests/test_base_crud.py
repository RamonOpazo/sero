import pytest
from sqlalchemy.orm import Session

from backend.crud.base import BaseCrud
from backend.db.models import Project, Document, File
from backend.api.schemas.projects_schema import ProjectCreate, ProjectUpdate
from backend.api.schemas.documents_schema import DocumentCreate, DocumentUpdate
from backend.api.schemas.files_schema import FileCreate
from backend.api.enums import FileType
from backend.core.security import security_manager


class TestBaseCrud:
    """Test the base CRUD functionality."""

    @pytest.fixture
    def project_crud(self):
        """Create a project CRUD instance for testing."""
        return BaseCrud[Project, ProjectCreate, ProjectUpdate](Project)

    def test_create_and_search_project(self, test_session: Session, project_crud):
        """Test creating a project and searching for it."""
        # Create test data
        project_data = ProjectCreate(
            name="Test Search Project",
            description="A project for testing search functionality",
            version=1,
            contact_name="Test User",
            contact_email="test@example.com",
            password="TestPassword123!"
        )
        
        # Create project manually (since base CRUD doesn't handle password hashing)
        project = Project(
            name=project_data.name,
            description=project_data.description,
            version=project_data.version,
            contact_name=project_data.contact_name,
            contact_email=project_data.contact_email,
            password_hash=security_manager.hash_password(project_data.password).encode("utf-8")
        )
        
        test_session.add(project)
        test_session.commit()
        test_session.refresh(project)
        

        # Test 1: Search all projects (no filters)
        all_projects = project_crud.search(db=test_session, skip=0, limit=100)
        assert len(all_projects) >= 1
        assert any(p.name == "Test Search Project" for p in all_projects)

        # Test 2: Search by version
        version_projects = project_crud.search(db=test_session, skip=0, limit=100, version=1)
        assert len(version_projects) >= 1
        assert any(p.name == "Test Search Project" for p in version_projects)

        # Test 3: Search by exact name
        exact_projects = project_crud.search(db=test_session, skip=0, limit=100, name=("eq", "Test Search Project"))
        assert len(exact_projects) == 1
        assert exact_projects[0].name == "Test Search Project"

        # Test 4: Search by like pattern
        like_projects = project_crud.search(db=test_session, skip=0, limit=100, name=("like", "%Search%"))
        assert len(like_projects) >= 1
        assert any(p.name == "Test Search Project" for p in like_projects)

        # Test 5: Search by like pattern (exact match)
        exact_like_projects = project_crud.search(db=test_session, skip=0, limit=100, name=("like", "Test Search Project"))
        assert len(exact_like_projects) == 1
        assert exact_like_projects[0].name == "Test Search Project"

        # Test 6: Search with wildcard replacement (controller logic simulation)
        search_name = "Test Search Project"
        wildcard_projects = project_crud.search(db=test_session, skip=0, limit=100, name=("like", search_name.replace("*", "%")))
        assert len(wildcard_projects) >= 1
        assert any(p.name == "Test Search Project" for p in wildcard_projects)

        # Test 7: Search that should return nothing
        no_match_projects = project_crud.search(db=test_session, skip=0, limit=100, name=("like", "%NonExistent%"))
        assert len(no_match_projects) == 0

    def test_search_with_joins(self, test_session: Session, project_crud):
        """Test searching with joins."""
        # Create test data
        project = Project(
            name="Test Join Project",
            description="A project for testing joins",
            version=1,
            contact_name="Test User",
            contact_email="test@example.com",
            password_hash=security_manager.hash_password("TestPassword123!").encode("utf-8")
        )
        
        test_session.add(project)
        test_session.commit()
        test_session.refresh(project)

        # Search with join and nested join path (documents.files)
        projects_with_docs = project_crud.search(
            db=test_session,
            skip=0,
            limit=100,
            join_with=["documents", "documents.files"],
            name=("eq", "Test Join Project")
        )
        assert len(projects_with_docs) == 1
        assert projects_with_docs[0].name == "Test Join Project"
        assert hasattr(projects_with_docs[0], 'documents')

    def test_search_with_ordering(self, test_session: Session, project_crud):
        """Test searching with ordering."""
        # Create multiple test projects
        projects_data = [
            ("Z Project", 3),
            ("A Project", 1),
            ("M Project", 2)
        ]
        
        for name, version in projects_data:
            project = Project(
                name=name,
                description=f"Description for {name}",
                version=version,
                contact_name="Test User",
                contact_email="test@example.com",
                password_hash=security_manager.hash_password("TestPassword123!").encode("utf-8")
            )
            test_session.add(project)
        
        test_session.commit()

        # Search with name ordering (ascending)
        ordered_projects = project_crud.search(
            db=test_session,
            skip=0,
            limit=100,
            order_by=[("name", "asc")]
        )
        
        # Should be ordered: A Project, M Project, Z Project (plus any other projects)
        project_names = [p.name for p in ordered_projects]
        test_projects = [name for name in project_names if "Project" in name and name in ["A Project", "M Project", "Z Project"]]
        assert test_projects == ["A Project", "M Project", "Z Project"]

        # Search with version ordering (descending)
        version_ordered = project_crud.search(
            db=test_session,
            skip=0,
            limit=100,
            order_by=[("version", "desc")]
        )
        
        # Check that our test projects are in version descending order
        test_versions = []
        for p in version_ordered:
            if p.name in ["A Project", "M Project", "Z Project"]:
                test_versions.append(p.version)
        
        # Should be [3, 2, 1] for our test projects
        assert test_versions == [3, 2, 1]

    def test_search_multiple_filters(self, test_session: Session, project_crud):
        """Test searching with multiple filters."""
        # Create test projects with different combinations
        projects_data = [
            ("Multi Test A", 1, "Alpha"),
            ("Multi Test B", 1, "Beta"), 
            ("Multi Test C", 2, "Alpha"),
            ("Other Project", 1, "Alpha")
        ]
        
        for name, version, contact in projects_data:
            project = Project(
                name=name,
                description=f"Description for {name}",
                version=version,
                contact_name=contact,
                contact_email="test@example.com",
                password_hash=security_manager.hash_password("TestPassword123!").encode("utf-8")
            )
            test_session.add(project)
        
        test_session.commit()

        # Search with multiple filters: version=1 AND contact_name="Alpha" 
        filtered_projects = project_crud.search(
            db=test_session,
            skip=0,
            limit=100,
            version=1,
            contact_name=("eq", "Alpha")
        )
        
        # Should find "Multi Test A" and "Other Project"
        found_names = [p.name for p in filtered_projects]
        assert "Multi Test A" in found_names
        assert "Other Project" in found_names
        assert "Multi Test B" not in found_names  # Wrong contact
        assert "Multi Test C" not in found_names  # Wrong version

        # Search with name pattern AND version
        pattern_filtered = project_crud.search(
            db=test_session,
            skip=0,
            limit=100,
            name=("like", "%Multi Test%"),
            version=1
        )
        
        # Should find "Multi Test A" and "Multi Test B" but not "Multi Test C"
        pattern_names = [p.name for p in pattern_filtered]
        assert "Multi Test A" in pattern_names
        assert "Multi Test B" in pattern_names
        assert "Multi Test C" not in pattern_names
        assert "Other Project" not in pattern_names

    def test_search_with_none_values(self, test_session: Session, project_crud):
        """Test that None values are properly ignored in search filters."""
        # Create test projects
        projects_data = [
            ("None Test A", 1),
            ("None Test B", 2),
        ]
        
        for name, version in projects_data:
            project = Project(
                name=name,
                description=f"Description for {name}",
                version=version,
                contact_name="Test User",
                contact_email="test@example.com",
                password_hash=security_manager.hash_password("TestPassword123!").encode("utf-8")
            )
            test_session.add(project)
        
        test_session.commit()

        # Search with None version should return all projects (no version filter applied)
        all_with_none_version = project_crud.search(
            db=test_session,
            skip=0,
            limit=100,
            version=None  # This should be ignored
        )
        
        # Should find both projects since None is ignored
        found_names = [p.name for p in all_with_none_version]
        assert "None Test A" in found_names
        assert "None Test B" in found_names

        # Search with None name should return all projects (no name filter applied)
        all_with_none_name = project_crud.search(
            db=test_session,
            skip=0,
            limit=100,
            name=None  # This should be ignored
        )
        
        # Should find both projects since None is ignored
        found_names = [p.name for p in all_with_none_name]
        assert "None Test A" in found_names
        assert "None Test B" in found_names

        # Search with both None values should return all projects
        all_with_both_none = project_crud.search(
            db=test_session,
            skip=0,
            limit=100,
            name=None,
            version=None
        )
        
        # Should find both projects since both None values are ignored
        found_names = [p.name for p in all_with_both_none]
        assert "None Test A" in found_names
        assert "None Test B" in found_names

        # Search with actual version should work normally
        version_1_projects = project_crud.search(
            db=test_session,
            skip=0,
            limit=100,
            version=1
        )
        
        # Should find only version 1 project
        version_1_names = [p.name for p in version_1_projects]
        assert "None Test A" in version_1_names
        assert "None Test B" not in version_1_names

    def test_create_read_update_delete_count_exist_and_filters(self, test_session: Session):
        # Instantiate CRUDs
        project_crud_local = BaseCrud[Project, ProjectCreate, ProjectUpdate](Project)
        document_crud = BaseCrud[Document, DocumentCreate, DocumentUpdate](Document)

        # Create via CRUD.create
        pc = ProjectCreate(
            name="BaseCrud Project",
            description="desc",
            version=1,
            contact_name="Tester",
            contact_email="tester@example.com",
            password="StrongPW!123",
        )
        # BaseCrud.create uses schema dump; Project requires password_hash, so create ORM manually then use read/update/delete on CRUD
        proj = Project(
            name=pc.name,
            description=pc.description,
            version=pc.version,
            contact_name=pc.contact_name,
            contact_email=pc.contact_email,
            password_hash=security_manager.hash_password(pc.password).encode("utf-8"),
        )
        test_session.add(proj)
        test_session.commit()
        test_session.refresh(proj)

        # count/exist/read
        assert project_crud_local.count(test_session) >= 1
        assert project_crud_local.exist(test_session, id=proj.id) is True
        got = project_crud_local.read(test_session, id=proj.id, join_with=["documents"])  # join_with
        assert got and got.id == proj.id

        # update field via CRUD.update
        updated = project_crud_local.update(test_session, id=proj.id, data=ProjectUpdate(description="updated"))
        assert updated and updated.description == "updated"
        assert updated.updated_at is not None

        # add a document and file for nested join test
        dc = Document(
            name="D1.pdf",
            description=None,
            project_id=proj.id,
            tags=[],
        )
        test_session.add(dc)
        test_session.commit()
        test_session.refresh(dc)
        f = File(
            file_hash="0"*64,
            file_type=FileType.ORIGINAL,
            mime_type="application/pdf",
            data=b"e",
            salt=b"s",
            document_id=dc.id,
        )
        test_session.add(f)
        test_session.commit()

        # search nested join path
        got2 = project_crud_local.search(test_session, skip=0, limit=10, join_with=["documents.files"], name=("eq", proj.name))
        assert got2 and got2[0].documents and got2[0].documents[0].files

        # filters: in, not-in, neq and bad cases
        in_res = project_crud_local.search(test_session, skip=0, limit=1000, version=("in", [proj.version, 2]))
        assert any(p.id == proj.id for p in in_res)
        not_in_res = project_crud_local.search(test_session, skip=0, limit=1000, version=("not-in", [99]))
        assert any(p.id == proj.id for p in not_in_res)
        neq_res = project_crud_local.search(test_session, skip=0, limit=1000, name=("neq", "nope"))
        assert any(p.id == proj.id for p in neq_res)
        with pytest.raises(ValueError):
            project_crud_local.search(test_session, skip=0, limit=10, name=("badop", "x"))
        with pytest.raises(AttributeError):
            project_crud_local.search(test_session, skip=0, limit=10, not_a_field=("eq", 1))

        # delete
        deleted = project_crud_local.delete(test_session, id=proj.id)
        assert deleted and deleted.id == proj.id
        assert project_crud_local.exist(test_session, id=proj.id) is False
