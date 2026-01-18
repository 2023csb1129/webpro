import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, UserCheck, Shield } from 'lucide-react';

interface RoleSelectorProps {
  onSelectRole: (role: UserRole) => void;
}

const roles: { role: UserRole; title: string; description: string; icon: React.ReactNode }[] = [
  {
    role: 'student',
    title: 'Student',
    description: 'Browse and enroll in courses',
    icon: <GraduationCap className="h-8 w-8" />,
  },
  {
    role: 'instructor',
    title: 'Course Instructor',
    description: 'Approve enrollment requests',
    icon: <BookOpen className="h-8 w-8" />,
  },
  {
    role: 'advisor',
    title: 'Branch Advisor',
    description: 'Final enrollment approval',
    icon: <UserCheck className="h-8 w-8" />,
  },
  {
    role: 'admin',
    title: 'Admin',
    description: 'Manage courses and users',
    icon: <Shield className="h-8 w-8" />,
  },
];

const RoleSelector = ({ onSelectRole }: RoleSelectorProps) => {
  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl border-0 animate-scale-in">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-heading font-bold text-foreground">
          Select Your Role
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Choose a demo role to explore the system
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {roles.map(({ role, title, description, icon }) => (
            <Button
              key={role}
              variant="outline"
              className="h-auto p-6 flex flex-col items-center gap-3 hover:bg-primary hover:text-primary-foreground group transition-all duration-300 card-hover"
              onClick={() => onSelectRole(role)}
            >
              <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary-foreground/20 group-hover:text-primary-foreground transition-colors">
                {icon}
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{title}</p>
                <p className="text-sm text-muted-foreground group-hover:text-primary-foreground/80">
                  {description}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoleSelector;
