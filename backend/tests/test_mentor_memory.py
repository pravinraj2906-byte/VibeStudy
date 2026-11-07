from app.models.project import Project


def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


def test_personal_mentor_memory_is_saved_per_user_and_project(client, db_session, test_user, test_user_token):
    project = db_session.query(Project).filter(
        Project.user_id == test_user.id,
        Project.name == "Mentor Memory Test Project",
    ).first()
    if not project:
        project = Project(
            user_id=test_user.id,
            name="Mentor Memory Test Project",
            default_branch="main",
            status="ready",
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)

    initial = client.get(
        f"/api/v1/projects/{project.id}/mentor-memory",
        headers=auth_headers(test_user_token),
    )
    assert initial.status_code == 200
    assert initial.json()["project_id"] == project.id

    payload = {
        "goal": "Explain the architecture confidently to a hackathon judge",
        "teaching_mode": "guided",
        "learned_topics": ["authentication", "data flow"],
        "conversation": [
            {"id": "1", "sender": "user", "text": "How does auth work?", "timestamp": "10:30"},
            {"id": "2", "sender": "mentor", "text": "Let us trace the token.", "timestamp": "10:31"},
        ],
    }
    saved = client.put(
        f"/api/v1/projects/{project.id}/mentor-memory",
        headers=auth_headers(test_user_token),
        json=payload,
    )
    assert saved.status_code == 200
    assert saved.json()["goal"] == payload["goal"]
    assert saved.json()["learned_topics"] == payload["learned_topics"]

    read_back = client.get(
        f"/api/v1/projects/{project.id}/mentor-memory",
        headers=auth_headers(test_user_token),
    )
    assert read_back.status_code == 200
    assert read_back.json()["conversation"] == payload["conversation"]


def test_mentor_memory_rejects_other_users_project(client, db_session, test_user, other_user_token):
    project = db_session.query(Project).filter(Project.user_id == test_user.id).first()
    assert project is not None
    response = client.get(
        f"/api/v1/projects/{project.id}/mentor-memory",
        headers=auth_headers(other_user_token),
    )
    assert response.status_code == 403

