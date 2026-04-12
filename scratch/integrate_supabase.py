import sys
import os

filepath = 'src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Imports
imports_code = """import { supabase } from './supabaseClient';
import { 
  FilePlus, ArrowLeft, Download, Trash2, GripVertical, 
  Layers, Move, Loader2, CheckCircle2, AlertCircle, FolderArchive, 
  FileImage, FileText, FileSpreadsheet, Globe, Zap, ShieldCheck, Sparkles, Wand2, 
  Presentation, X, LogIn, LogOut, User as UserIcon
} from 'lucide-react';"""

# Replace lucide-react block
import re
content = re.sub(r'import \{.*?\} from \'lucide-react\';', imports_code, content, flags=re.DOTALL)

# 2. Add Auth Logic
auth_logic = """
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) checkProStatus(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkProStatus(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProStatus = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('is_pro')
      .eq('id', userId)
      .single();
    if (data) setIsPro(data.is_pro);
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsPro(false);
  };
"""

content = content.replace('export default function App() {', 'export default function App() {' + auth_logic)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
