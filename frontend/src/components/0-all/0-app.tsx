import { Toaster } from '@/ui/shadcn/sonner';
import { Header } from '../1-header';
import { Section3_Footer } from '../3-footer';
import { MainBody } from './1-main-body';
import { AllDialogs } from './9-globals';

export function App() {
    return (<>
        <Toaster />
        <AllDialogs />
        
        <main className="h-screen text-xs bg-background grid grid-rows-[auto_1fr_auto]">
            <Header />
            <MainBody />
            <Section3_Footer />
        </main>
    </>);
}
