// Package bus implements a small grouped command bus that routes frontend
// requests to backend handlers.
//
// Handlers are registered under a named group. Each group has its own mutex,
// so calls within the same group are serialized and cannot interfere with one
// another, while calls to different groups run concurrently.
package bus

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
)

// HandlerFunc handles a single command. The raw JSON payload sent by the
// frontend is passed in, and the returned value is JSON-marshaled back.
type HandlerFunc func(ctx context.Context, payload json.RawMessage) (any, error)

// group is a named collection of command handlers guarded by a single mutex.
type group struct {
	mu       sync.Mutex
	handlers map[string]HandlerFunc
}

// Bus is a registry of command groups.
type Bus struct {
	mu     sync.RWMutex
	groups map[string]*group
}

// New creates an empty Bus.
func New() *Bus {
	return &Bus{
		groups: make(map[string]*group),
	}
}

// Register adds a command handler to a group, creating the group if needed.
// It panics if the same group/command pair is registered twice, since that is
// a programming error rather than a runtime condition.
func (b *Bus) Register(groupName, command string, h HandlerFunc) {
	b.mu.Lock()
	defer b.mu.Unlock()

	g, ok := b.groups[groupName]
	if !ok {
		g = &group{handlers: make(map[string]HandlerFunc)}
		b.groups[groupName] = g
	}
	if _, exists := g.handlers[command]; exists {
		panic(fmt.Sprintf("bus: command %q already registered in group %q", command, groupName))
	}
	g.handlers[command] = h
}

// Dispatch routes a command to its handler. The owning group's mutex is held
// for the duration of the handler so that same-group calls do not interfere.
func (b *Bus) Dispatch(ctx context.Context, groupName, command string, payload json.RawMessage) (any, error) {
	b.mu.RLock()
	g, ok := b.groups[groupName]
	b.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("bus: unknown group %q", groupName)
	}

	g.mu.Lock()
	h, ok := g.handlers[command]
	if !ok {
		g.mu.Unlock()
		return nil, fmt.Errorf("bus: unknown command %q in group %q", command, groupName)
	}
	defer g.mu.Unlock()

	return h(ctx, payload)
}
