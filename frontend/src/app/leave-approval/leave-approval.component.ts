import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AttendanceService, Leave, ApproveLeaveRequest } from '../services/attendance.service';

@Component({
  selector: 'app-leave-approval',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="leave-approval">
      <div class="page-header">
        <div class="header-left">
          <button (click)="goBack()" class="btn-back">
            ← 返回
          </button>
          <h2>请假审批</h2>
        </div>
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
            <span *ngIf="tab.value === 'pending' && pendingCount > 0" class="badge">
              {{ pendingCount }}
            </span>
          </button>
        </div>
      </div>

      <div *ngIf="successMessage" class="success-alert">
        <span class="check-icon">✓</span>
        {{ successMessage }}
      </div>

      <div *ngIf="errorMessage" class="error-alert">
        <span class="error-icon">✕</span>
        {{ errorMessage }}
      </div>

      <div class="leaves-section card">
        <div *ngIf="loading" class="loading-container">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <div *ngIf="!loading && leaves.length === 0" class="empty-state">
          <div class="empty-icon">✅</div>
          <p class="empty-title">暂无请假申请</p>
          <p class="empty-desc">当前没有需要处理的请假申请</p>
        </div>

        <div *ngIf="!loading && leaves.length > 0" class="leaves-list">
          <div *ngFor="let leave of leaves" class="leave-card">
            <div class="leave-header">
              <div class="employee-info">
                <div class="avatar">{{ leave.user?.name?.charAt(0) || '?' }}</div>
                <div class="employee-details">
                  <div class="employee-name">{{ leave.user?.name || '未知' }}</div>
                  <div class="leave-type-small">{{ getLeaveTypeLabel(leave.leave_type) }}</div>
                </div>
              </div>
              <div class="leave-status" [class]="leave.status">
                {{ getStatusLabel(leave.status) }}
              </div>
            </div>

            <div class="leave-body">
              <div class="leave-dates">
                <div class="date-item">
                  <span class="date-label">开始日期</span>
                  <span class="date-value">{{ leave.start_date | date:'yyyy-MM-dd' }}</span>
                </div>
                <div class="date-arrow">→</div>
                <div class="date-item">
                  <span class="date-label">结束日期</span>
                  <span class="date-value">{{ leave.end_date | date:'yyyy-MM-dd' }}</span>
                </div>
                <div class="days-item">
                  <span class="days-value">{{ leave.days }}</span>
                  <span class="days-label">个工作日</span>
                </div>
              </div>

              <div class="leave-reason">
                <span class="reason-label">请假事由：</span>
                <span class="reason-text">{{ leave.reason }}</span>
              </div>

              <div *ngIf="leave.status !== 'pending'" class="approval-info-section">
                <div class="approval-info">
                  <span class="info-label">审批人：</span>
                  <span class="info-value">{{ leave.approver?.name || '系统' }}</span>
                </div>
                <div *ngIf="leave.approval_note" class="approval-info">
                  <span class="info-label">审批意见：</span>
                  <span class="info-value">{{ leave.approval_note }}</span>
                </div>
                <div class="approval-info">
                  <span class="info-label">审批时间：</span>
                  <span class="info-value">{{ formatDateTime(leave.updated_at) }}</span>
                </div>
              </div>
            </div>

            <div *ngIf="leave.status === 'pending'" class="leave-actions">
              <div class="approval-note-input">
                <label class="note-input-label">审批意见（可选）</label>
                <input 
                  type="text" 
                  [(ngModel)]="approvalNotes[leave.id]"
                  placeholder="请输入审批意见..."
                  class="form-input"
                />
              </div>
              <div class="action-buttons">
                <button 
                  (click)="rejectLeave(leave)"
                  class="btn-reject"
                  [disabled]="submittingId === leave.id"
                >
                  {{ submittingId === leave.id ? '处理中...' : '拒绝' }}
                </button>
                <button 
                  (click)="approveLeave(leave)"
                  class="btn-approve"
                  [disabled]="submittingId === leave.id"
                >
                  {{ submittingId === leave.id ? '处理中...' : '批准' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .leave-approval {
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
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .filter-tab:hover {
      background: #e9ecef;
    }
    .filter-tab.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .filter-tab .badge {
      background: rgba(255, 255, 255, 0.3);
      padding: 0.125rem 0.5rem;
      border-radius: 10px;
      font-size: 0.75rem;
    }
    .success-alert {
      background: #d4edda;
      color: #155724;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 500;
    }
    .error-alert {
      background: #f8d7da;
      color: #721c24;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 500;
    }
    .check-icon, .error-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
    }
    .check-icon {
      background: #28a745;
      color: white;
    }
    .error-icon {
      background: #dc3545;
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
    .employee-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 1rem;
    }
    .employee-details {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .employee-name {
      font-weight: 600;
      color: #333;
      font-size: 0.9375rem;
    }
    .leave-type-small {
      font-size: 0.75rem;
      color: #666;
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
      gap: 1rem;
      flex-wrap: wrap;
    }
    .date-item {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .date-label {
      font-size: 0.75rem;
      color: #666;
    }
    .date-value {
      font-size: 0.9375rem;
      font-weight: 500;
      color: #333;
    }
    .date-arrow {
      color: #666;
      font-size: 1.25rem;
    }
    .days-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #f0f0f0;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      margin-left: auto;
    }
    .days-value {
      font-size: 1.25rem;
      font-weight: 700;
      color: #667eea;
    }
    .days-label {
      font-size: 0.75rem;
      color: #666;
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
    .approval-info-section {
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .approval-info {
      display: flex;
      gap: 0.25rem;
      font-size: 0.8125rem;
    }
    .info-label {
      color: #666;
    }
    .info-value {
      color: #333;
      font-weight: 500;
    }
    .leave-actions {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .approval-note-input {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .note-input-label {
      font-size: 0.8125rem;
      color: #666;
      font-weight: 500;
    }
    .form-input {
      padding: 0.75rem 1rem;
      border: 1px solid #ddd;
      border-radius: 8px;
      font-size: 0.875rem;
      transition: border-color 0.3s;
    }
    .form-input:focus {
      outline: none;
      border-color: #667eea;
    }
    .action-buttons {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }
    .btn-reject, .btn-approve {
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn-reject {
      background: #f8d7da;
      color: #721c24;
    }
    .btn-reject:hover:not(:disabled) {
      background: #f5c6cb;
    }
    .btn-approve {
      background: #d4edda;
      color: #155724;
    }
    .btn-approve:hover:not(:disabled) {
      background: #c3e6cb;
    }
    .btn-reject:disabled, .btn-approve:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class LeaveApprovalComponent implements OnInit {
  leaves: Leave[] = [];
  loading = false;
  currentFilter = 'pending';
  pendingCount = 0;
  submittingId: number | null = null;
  successMessage = '';
  errorMessage = '';
  approvalNotes: { [key: number]: string } = {};

  filterTabs = [
    { label: '待审批', value: 'pending' },
    { label: '全部', value: 'all' },
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
    this.successMessage = '';
    this.errorMessage = '';

    if (this.currentFilter === 'pending') {
      this.attendanceService.getPendingLeaves().subscribe({
        next: (data) => {
          this.leaves = data;
          this.pendingCount = data.length;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    } else {
      const statusFilter = this.currentFilter === 'all' ? undefined : this.currentFilter;
      this.attendanceService.getAllLeaves(statusFilter).subscribe({
        next: (data) => {
          this.leaves = data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    }
  }

  approveLeave(leave: Leave): void {
    this.processLeave(leave, 'approved');
  }

  rejectLeave(leave: Leave): void {
    this.processLeave(leave, 'rejected');
  }

  processLeave(leave: Leave, status: 'approved' | 'rejected'): void {
    this.submittingId = leave.id;
    this.successMessage = '';
    this.errorMessage = '';

    const request: ApproveLeaveRequest = {
      status,
      approval_note: this.approvalNotes[leave.id] || ''
    };

    this.attendanceService.approveLeave(leave.id, request).subscribe({
      next: () => {
        this.submittingId = null;
        this.successMessage = `请假已${status === 'approved' ? '批准' : '拒绝'}！`;
        delete this.approvalNotes[leave.id];
        this.loadLeaves();
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: () => {
        this.submittingId = null;
        this.errorMessage = '操作失败，请稍后重试。';
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

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
