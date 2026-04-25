import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { EmployeeDashboardComponent } from './employee-dashboard/employee-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { LeaveRequestComponent } from './leave-request/leave-request.component';
import { MyLeavesComponent } from './my-leaves/my-leaves.component';
import { LeaveApprovalComponent } from './leave-approval/leave-approval.component';
import { AuthGuard } from './guards/auth.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'employee', 
    component: EmployeeDashboardComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'employee/leave-request', 
    component: LeaveRequestComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'employee/leaves', 
    component: MyLeavesComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'admin', 
    component: AdminDashboardComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  { 
    path: 'admin/approval', 
    component: LeaveApprovalComponent,
    canActivate: [AuthGuard, AdminGuard]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];
