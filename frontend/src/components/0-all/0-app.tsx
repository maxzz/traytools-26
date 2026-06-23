import { Toaster } from '@/ui/shadcn/sonner';
import { AllDialogs } from './1-globals';
import { Header } from '../1-header';
import { MainBody } from '../2-main';
import { Section3_Footer } from '../3-footer';

export function App() {
    return (<>
        <Toaster />
        <AllDialogs />
        
        <main className="min-h-screen text-xs bg-background grid grid-rows-[auto_1fr_auto]">
            <Header />
            <MainBody />
            <Section3_Footer />
        </main>
    </>);
}

/*
import { useEffect } from 'react';
import { ToggleDevTools } from '../../wailsjs/go/backend/App';
// import wailsLogo from './assets/wails.png';

export function App() {

    useEffect(
        () => {
            function handleKeyDown(e: KeyboardEvent) {
                const isDevToolsShortcut = (e.ctrlKey && e.shiftKey && e.code === 'F12') || (e.ctrlKey && e.shiftKey && e.code === 'KeyI');
                if (isDevToolsShortcut) {
                    ToggleDevTools().catch(console.error);
                }
            }
            
            const controller = new AbortController();
            window.addEventListener('keydown', handleKeyDown, { signal: controller.signal });
            return () => controller.abort();
        }, []
    );

    return (
        <div className="min-h-screen text-sm bg-white grid grid-rows-[auto_1fr_auto]">

            <header className="p-3 text-center text-white bg-linear-to-r from-blue-500 to-blue-700 border-b border-blue-900 shadow">
                Go wrapped frontend
            </header>

            <main className="self-center justify-self-center p-4">
                <div className="font-bold text-blue-900">
                    Go wrapped frontend
                </div>
            </main>

            <footer className="p-3 text-center text-white bg-linear-to-r from-blue-500 to-blue-700 border-t border-blue-900">
                <p>&copy; 2026 No rights reserved.</p>
                {/* <div className="w-fit max-w-md">
                    <a href="https://wails.io" target="_blank">
                        <img src={wailsLogo} className="logo wails" alt="Wails logo" />
                    </a>
                </div> * /}
                </footer>

                </div>
            );
        }
        
*/
