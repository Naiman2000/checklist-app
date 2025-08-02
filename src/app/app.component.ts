import { Component, OnInit } from '@angular/core';

interface Task {
  name: string;
  description: string;
  done: boolean;
  category: string;
  deadline?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'checklist-app';
  tasks: Task[] = [];
  currentCategory: string = 'All';
  editTaskIndex: number | null = null;

  ngOnInit(): void {
    this.renderTasks();
  }

  showModal(editIndex: number | null = null): void {
    const input = document.getElementById('modalTaskInput') as HTMLInputElement;
    const desc = document.getElementById('modalDescription') as HTMLInputElement;
    const deadlineInput = document.getElementById('modalDeadline') as HTMLInputElement;

    if (editIndex !== null) {
      this.editTaskIndex = editIndex;
      const task = this.tasks[editIndex];
      input.value = task.name;
      desc.value = task.description;
      deadlineInput.value = task.deadline || '';
      (document.getElementById('submitTaskBtn') as HTMLButtonElement).innerText = 'Save';
    } else {
      this.editTaskIndex = null;
      input.value = '';
      desc.value = '';
      deadlineInput.value = '';
      (document.getElementById('submitTaskBtn') as HTMLButtonElement).innerText = 'Add';
    }

    (document.getElementById('taskModal') as HTMLElement).style.display = 'flex';
  }

  closeModal(): void {
    (document.getElementById('taskModal') as HTMLElement).style.display = 'none';
  }

  submitTask(): void {
    const input = document.getElementById('modalTaskInput') as HTMLInputElement;
    const desc = document.getElementById('modalDescription') as HTMLInputElement;
    const deadlineInput = document.getElementById('modalDeadline') as HTMLInputElement;

    const name = input.value.trim();
    const description = desc.value.trim();
    const deadline = deadlineInput.value;

    if (!name) return;

    if (this.editTaskIndex !== null) {
      const task = this.tasks[this.editTaskIndex];
      task.name = name;
      task.description = description;
      task.deadline = deadline;
    } else {
      this.tasks.push({
        name,
        description,
        done: false,
        category: this.currentCategory,
        deadline,
      });
    }

    this.closeModal();
    this.renderTasks();
  }

  toggleTask(index: number): void {
    this.tasks[index].done = !this.tasks[index].done;
    this.renderTasks();
  }

  deleteTask(index: number): void {
    this.tasks.splice(index, 1);
    this.renderTasks();
  }

  switchCategory(cat: string): void {
    this.currentCategory = cat;
    document.querySelectorAll('.tabs button').forEach((btn) => btn.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.tabs button')).find(
      (b) => b.textContent === cat
    );
    if (btn) btn.classList.add('active');
    this.renderTasks();
  }

  renderTasks(): void {
    const list = document.getElementById('taskList') as HTMLElement;
    if (!list) return;
    list.innerHTML = '';

    const filteredTasks = this.tasks
      .map((task, index) => ({ task, index }))
      .filter(({ task }) => this.currentCategory === 'All' || task.category === this.currentCategory);

    filteredTasks.forEach(({ task, index }) => {
      const li = document.createElement('li');

      let deadlineDisplay = '';
      let deadlineClass = '';

      if (task.deadline) {
        const today = new Date();
        const deadlineDate = new Date(task.deadline + 'T23:59:59');
        const diffTime = deadlineDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          deadlineClass = 'overdue';
        } else if (diffDays === 0) {
          deadlineClass = 'due-today';
        }

        deadlineDisplay = `<span class="deadline ${deadlineClass}">Due: ${task.deadline}</span>`;
      }

      li.innerHTML = `
        <div style="flex: 1;">
          <span (click)="toggleTask(${index})" class="${task.done ? 'completed' : ''}">${task.name}</span>
          <button (click)="editTask(${index})" style="cursor: pointer; background: none; border: none; color: #007bff; font-size: 1rem;">✏️ Edit</button>
          <div>${deadlineDisplay}</div>
          <div class="description">${task.description || ''}</div>
        </div>
        <span class="trash" (click)="deleteTask(${index})">🗑️</span>
      `;
      list.appendChild(li);
    });
  }

  editTask(index: number): void {
    this.showModal(index);
  }

  toggleDarkMode(): void {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    const btn = document.getElementById('modeToggleBtn') as HTMLElement;
    btn.innerText = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
  }
}
