import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AttendanceService, Leave } from '../services/attendance.service';

@Component({
  selector: 'app-my-leaves',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="my-leaves">
      <div class="page-header">
        <div class="header-left">
          <button (click)="goBack()" class="btn-back">
            ← 返回
          </button>
          <h2>我的请假</h2>
        </div>
        <button (click)="goToRequest()" class="btn-primary">
          + 新建请假
        </button>
      </div>

      <div class="filter-section card">
        <div class="filter-tabs">
          <button 
            *ngFor="let tab of filterTabs"
            (click)="setFilter(tab.value)"
            class="filter-tab"
            [class.active]="currentFilter === tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="leaves-section card">
        <div *ngIf="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <div *ngIf="!loading && leaves.length === 0" class="empty-state">
          <div class="empty-icon">📋</div>
          <p class="empty-title">暂无请假记录</p>
          <p class="empty-desc">点击上方"新建请假"按钮申请请假</p>
        </div>

        <div *ngIf="!loading && leaves.length > 0" class="leaves-list">
          <div *ngFor="let leave of leaves" class="leave-card">
            <div class="leave-header">
              <div class="leave-type-badge" [class]="leave.leave_type">
                {{ getLeaveTypeLabel(leave.leave_type) }}
              </div>
              <div class="leave-status" [class]="leave.status">
                {{ getStatusLabel(leave.status) }}
              </div>
            </div>

            <div class="leave-body">
              <div class="leave-dates">
                <span class="date-icon">📅</span>
                <span class="date-text">{{ leave.start_date }} 至 {{ leave.end_date }}</span>
                <span class="days-badge">{{ leave.days }} 个工作日</span>
              </div>

              <div class="leave-reason">
                <span class="reason-label">请假事由：</span>
                <span class="reason-text">{{ leave.reason }}</span>
              </div>
            </div>

            <div class="leave-footer" *ngIf="leave.status !== 'pending'">
              <div class="approval-info">
                <span class="approver-label">审批人：</span>
                <span class="approver-name">{{ leave.approver?.name || '系统' }}</span>
              </div>
              <div *ngIf="leave.approval_note" class="approval-note">
                <span class="note-label">审批意见：</span>
                <span class="note-text">{{ leave.approval_note }}</span>
              </div>
              <div class="approval-time">
                <span class="time-label">审批时间：</span>
                <span class="time-text">{{ formatDateTime(leave.updated_at) }}</span>
              </div>
            </div>

            <div class="leave-footer pending" *ngIf="leave.status === 'pending'">
              <div class="pending-notice">
                <span class="pending-icon">⏳</span>
                <span>等待审批中...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .my-leaves {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .page-header h2 {
      margin: 0;
      color: #333;
      font-size: 1.5rem;
    }
    .btn-back {
      background: transparent;
      border: 1px solid #ddd;
      color: #666;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.3s;
    }
    .btn-back:hover {
      background: #f5f5f5;
      border-color: #ccc;
    }
    .btn-primary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }
    .card {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .filter-section {
      padding: 0.75rem 1.5rem;
    }
    .filter-tabs {
      display: flex;
      gap: 0.5rem;
    }
    .filter-tab {
      padding: 0.5rem 1.25rem;
      border: none;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      background: #f5f5f5;
      color: #666;
      transition: all 0.3s;
    }
    .filter-tab:hover {
      background: #e9ecef;
    }
    .filter-tab.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 1rem;
    }
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .loading-container p {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 0.5rem;
    }
    .empty-icon {
      font-size: 3rem;
    }
    .empty-title {
      margin: 0.5rem 0 0 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #333;
    }
    .empty-desc {
      margin: 0;
      color: #666;
      font-size: 0.875rem;
    }
    .leaves-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .leave-card {
      border: 1px solid #e0e0e0;
      border-radius: 10px;
      padding: 1.25rem;
      transition: all 0.3s;
    }
    .leave-card:hover {
      border-color: #667eea;
      box-shadow: 0 2px 10px rgba(102, 126, 234, 0.1);
    }
    .leave-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .leave-type-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .leave-type-badge.personal {
      background: #e3f2fd;
      color: #1976d2;
    }
    .leave-type-badge.sick {
      background: #fce4ec;
      color: #c2185b;
    }
    .leave-type-badge.annual {
      background: #e8f5e9;
      color: #388e3c;
    }
    .leave-status {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .leave-status.pending {
      background: #fff3cd;
      color: #856404;
    }
    .leave-status.approved {
      background: #d4edda;
      color: #155724;
    }
    .leave-status.rejected {
      background: #f8d7da;
      color: #721c24;
    }
    .leave-body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .leave-dates {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9375rem;
      color: #333;
    }
    .date-icon {
      font-size: 1rem;
    }
    .date-text {
      font-weight: 500;
    }
    .days-badge {
      background: #f0f0f0;
      color: #666;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    .leave-reason {
      display: flex;
      gap: 0.25rem;
      font-size: 0.875rem;
    }
    .reason-label {
      color: #666;
      font-weight: 500;
    }
    .reason-text {
      color: #333;
    }
    .leave-footer {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.8125rem;
    }
    .leave-footer.pending {
      border-top: none;
      padding-top: 0;
      margin-top: 0.75rem;
    }
    .pending-notice {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #856404;
      font-weight: 500;
    }
    .approval-info,
    .approval-note,
    .approval-time {
      display: flex;
      gap: 0.25rem;
    }
    .approver-label,
    .note-label,
    .time-label {
      color: #666;
    }
    .approver-name,
    .note-text,
    .time-text {
      color: #333;
      font-weight: 500;
    }
  `]
})
export class MyLeavesComponent implements OnInit {
  leaves: Leave[] = [];
  loading = false;
  currentFilter = 'all';

  filterTabs = [
    { label: '全部', value: 'all' },
    { label: '待审批', value: 'pending' },
    { label: '已批准', value: 'approved' },
    { label: '已拒绝', value: 'rejected' }
  ];

  constructor(
    private attendanceService: AttendanceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLeaves();
  }

  setFilter(filter: string): void {
    this.currentFilter = filter;
    this.loadLeaves();
  }

  loadLeaves(): void {
    this.loading = true;
    const statusFilter = this.currentFilter === 'all' ? undefined : this.currentFilter;

    this.attendanceService.getMyLeaves(statusFilter).subscribe({
      next: (data) => {
        this.leaves = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getLeaveTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'personal': '事假',
      'sick': '病假',
      'annual': '年假'
    };
    return labels[type] || type;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': '待审批',
      'approved': '已批准',
      'rejected': '已拒绝'
    };
    return labels[status] || status;
  }

  formatDateTime(dateTimeStr: string): string {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  goToRequest(): void {
    this.router.navigate(['/employee/leave-request']);
  }

  goBack(): void {
    this.router.navigate(['/employee']);
  }
}
