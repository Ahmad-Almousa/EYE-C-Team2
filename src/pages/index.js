import { useState, useEffect, useRef } from 'react';

export default function Home() {
    const [state, setState] = useState(null);
    const [checkboxState, setCheckboxState] = useState(null);
    const [isTabActive, setIsTabActive] = useState(true);
    const [isUserInteracting, setIsUserInteracting] = useState(false);

    // Request queue and status refs
    const requestQueue = useRef([]);
    const isRequestInProgress = useRef(false);
    const isTabActiveRef = useRef(isTabActive);
    const isUserInteractingRef = useRef(isUserInteracting);

    // Sync refs with state
    useEffect(() => { isTabActiveRef.current = isTabActive; }, [isTabActive]);
    useEffect(() => { isUserInteractingRef.current = isUserInteracting; }, [isUserInteracting]);

    // Request queue processor
    const processQueue = async () => {
        if (isRequestInProgress.current || requestQueue.current.length === 0) return;
        isRequestInProgress.current = true;
        const task = requestQueue.current.shift();
        try {
            await task();
        } catch (error) {
            console.error('Request error:', error);
        } finally {
            isRequestInProgress.current = false;
            processQueue();
        }
    };

    // Function to enqueue requests
    const enqueueRequest = (task) => {
        if (requestQueue.current.length < 10) { // Limit queue size to 10
            requestQueue.current.push(task);
            processQueue();
        } else {
            console.warn('Request queue full, dropping request.');
        }
    };

    const fetchState = () => {
        enqueueRequest(async () => {
            if (!isTabActiveRef.current || isUserInteractingRef.current) return;
            const res = await fetch('/api/state');
            const data = await res.json();

            // Update state only if there's a real change
            setState((prev) => (prev !== data.state ? data.state : prev));
            setCheckboxState((prev) => (prev !== data.checkboxState ? data.checkboxState : prev));
        });
    };

    // Fetch state from server
    useEffect(() => {
        let timeout;
        const fetchLoop = () => {
            fetchState();
            timeout = setTimeout(fetchLoop, 2000); // Re-run after 2s
        };
        fetchLoop();
        return () => clearTimeout(timeout);
    }, [isUserInteracting, isTabActive]);


    // Tab visibility handler
    useEffect(() => {
        const handleVisibilityChange = () => setIsTabActive(!document.hidden);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // User interaction handlers
    const handleRadioChange = (newState) => {
        setIsUserInteracting(true);
        enqueueRequest(async () => {
            try {
                await fetch('/api/state', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ state: newState }),
                });
                setState(newState);
            } finally {
                setIsUserInteracting(false);
            }
        });
    };

    const handleCheckboxChange = (value) => {
        setIsUserInteracting(true);
        const newCheckboxState = checkboxState === value ? null : value;
        enqueueRequest(async () => {
            try {
                await fetch('/api/state', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ state, checkboxState: newCheckboxState }),
                });
                setCheckboxState(newCheckboxState);
            } finally {
                setIsUserInteracting(false);
            }
        });
    };

    const resetState = () => {
        setIsUserInteracting(true);
        enqueueRequest(async () => {
            try {
                await fetch('/api/state', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ state: null, checkboxState: null }),
                });
                setState(null);
                setCheckboxState(null);
            } finally {
                setIsUserInteracting(false);
            }
        });
    };

    // UI rendering remains the same
    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1 style={{ color: '#C91F66' }}>Eye-C</h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', marginTop: '50px' }}>
                <div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '50px' }}>
                            <h2 style={{ flex: '1', fontSize: '20px', textWrap: 'nowrap' }}>Aktueller Benutzer</h2>
                            <h2 style={{ flex: '1', fontSize: '20px', textWrap: 'nowrap', color: '#D85817' }}>Im Warten...</h2>
                        </div>
                        {['TR', 'RT', 'KS', 'AK', '**', '**'].map((value) => (
                            <div key={value} style={{ display: 'flex', gap: '15px', borderBottom: '1px solid grey', padding: '16px' }}>
                                <label
                                    style={{
                                        fontSize: '20px',
                                        cursor: 'pointer',
                                        flex: '1',
                                    }}
                                >
                                    <input
                                        type="radio"
                                        disabled={state !== null}
                                        name="state"
                                        value={value}
                                        checked={state === value}
                                        onChange={() => handleRadioChange(value)}
                                        style={{
                                            marginRight: '10px',
                                            width: '18px',
                                            height: '18px',
                                            transform: 'scale(1.5)'
                                        }}
                                    />
                                    {value}
                                </label>
                                <label
                                    style={{
                                        fontSize: '20px',
                                        cursor: 'pointer',
                                        flex: '1',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        disabled={isUserInteracting || state === null || (checkboxState !== null && checkboxState !== value)}
                                        checked={checkboxState === value}
                                        onChange={() => handleCheckboxChange(value)}
                                        style={{
                                            marginRight: '10px',
                                            accentColor: checkboxState === value ? '#FFA500' : '#D3D3D3',
                                            width: '18px',
                                            height: '18px',
                                        }}
                                    />
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div
                onClick={() => state && resetState()}
                style={{
                    marginTop: '70px',
                    width: '20%',
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '20px',
                    backgroundColor: state ? 'red' : 'green',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    borderRadius: '10px',
                    cursor: state ? 'pointer' : 'not-allowed',
                }}
            >
                {state ? `Eye-C Besetzt: ${state}` : 'Eye-C Frei'}
            </div>
        </div>
    );
}


///*//
