import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { User, Mail, GraduationCap, Building2, ShieldCheck } from 'lucide-react';

const Sidebar = () => {
    const { user } = useAuth();

    if (!user) return null;

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return <ShieldCheck className="h-4 w-4" />;
            case 'instructor': return <Building2 className="h-4 w-4" />;
            case 'advisor': return <User className="h-4 w-4" />;
            default: return <GraduationCap className="h-4 w-4" />;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-destructive/10 text-destructive border-destructive/20';
            case 'instructor': return 'bg-primary/10 text-primary border-primary/20';
            case 'advisor': return 'bg-success/10 text-success border-success/20';
            default: return 'bg-accent/10 text-accent border-accent/20';
        }
    };

    const hasBranch = ['student', 'advisor'].includes(user.role);

    return (
        <aside className="hidden lg:flex flex-col w-72 h-[calc(100vh-4rem)] sticky top-16 border-r border-border bg-card/50 backdrop-blur-sm p-6 overflow-y-auto animate-in fade-in slide-in-from-left duration-500">
            {/* Profile Section */}
            <div className="flex flex-col items-center text-center space-y-4 pt-4 pb-8 border-b border-border/50">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative h-24 w-24 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-xl overflow-hidden">
                        <span className="text-3xl font-heading font-bold text-primary">
                            {getInitials(user.name)}
                        </span>
                    </div>
                </div>

                <div className="space-y-1">
                    <h3 className="font-heading font-bold text-xl tracking-tight">{user.name}</h3>
                    <Badge variant="outline" className={`capitalize gap-1.5 ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {user.role}
                    </Badge>
                </div>
            </div>

            {/* Details Section */}
            <div className="flex-1 py-8 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 group text-muted-foreground hover:text-foreground transition-colors">
                        <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
                            <Mail className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-[10px] uppercase tracking-wider font-bold opacity-50">Email Address</span>
                            <span className="text-sm truncate font-medium">{user.email}</span>
                        </div>
                    </div>

                    {user.department && (
                        <div className="flex items-center gap-3 group text-muted-foreground hover:text-foreground transition-colors">
                            <div className={`p-2 rounded-lg bg-muted group-hover:bg-${hasBranch ? 'accent' : 'success'}/10 group-hover:text-${hasBranch ? 'accent' : 'success'} transition-all`}>
                                {hasBranch ? <GraduationCap className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase tracking-wider font-bold opacity-50">
                                    {hasBranch ? 'Branch' : 'Department'}
                                </span>
                                {hasBranch ? (
                                    <Badge variant="secondary" className="w-fit text-xs font-bold uppercase tracking-wide bg-accent/20 text-accent">
                                        {user.department}
                                    </Badge>
                                ) : (
                                    <span className="text-sm font-medium">{user.department}</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer / System Status */}
            <div className="pt-6 border-t border-border/50">
                <div className="flex items-center justify-between px-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">
                    <span>System Status</span>
                    <span className="flex items-center gap-1 text-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
                        Active
                    </span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
