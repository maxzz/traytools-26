//go:build windows

package fileicon

import (
	"encoding/binary"
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	kernel32 = windows.NewLazySystemDLL("kernel32.dll")

	procEnumResourceNamesW = kernel32.NewProc("EnumResourceNamesW")
	procFindResourceW      = kernel32.NewProc("FindResourceW")
	procSizeofResource     = kernel32.NewProc("SizeofResource")
	procLoadResource       = kernel32.NewProc("LoadResource")
	procLockResource       = kernel32.NewProc("LockResource")
)

const (
	rtIcon      = 3
	rtGroupIcon = 14
)

type grpIconDirEntry struct {
	Width      uint8
	Height     uint8
	ColorCount uint8
	Reserved   uint8
	Planes     uint16
	BitCount   uint16
	BytesInRes uint32
	ID         uint16
}

// extractGroupIconICO loads the first RT_GROUP_ICON from a PE module and
// reassembles a standard .ico blob.
func extractGroupIconICO(path string) ([]byte, error) {
	mod, err := windows.LoadLibraryEx(
		path,
		0,
		windows.LOAD_LIBRARY_AS_DATAFILE|windows.LOAD_LIBRARY_AS_IMAGE_RESOURCE,
	)
	if err != nil {
		return nil, err
	}
	defer windows.FreeLibrary(mod)

	name, ok := firstResourceName(mod, rtGroupIcon)
	if !ok {
		return nil, fmt.Errorf("no group icon resource")
	}

	group, err := loadResourceBytes(mod, name, rtGroupIcon)
	if err != nil {
		return nil, err
	}
	if len(group) < 6 {
		return nil, fmt.Errorf("group icon truncated")
	}

	reserved := binary.LittleEndian.Uint16(group[0:2])
	itype := binary.LittleEndian.Uint16(group[2:4])
	count := int(binary.LittleEndian.Uint16(group[4:6]))
	if reserved != 0 || itype != 1 || count <= 0 {
		return nil, fmt.Errorf("invalid group icon header")
	}
	const grpEntrySize = 14
	if len(group) < 6+count*grpEntrySize {
		return nil, fmt.Errorf("group icon directory truncated")
	}

	entries := make([]grpIconDirEntry, count)
	images := make([][]byte, count)
	for i := 0; i < count; i++ {
		off := 6 + i*grpEntrySize
		entries[i] = grpIconDirEntry{
			Width:      group[off],
			Height:     group[off+1],
			ColorCount: group[off+2],
			Reserved:   group[off+3],
			Planes:     binary.LittleEndian.Uint16(group[off+4 : off+6]),
			BitCount:   binary.LittleEndian.Uint16(group[off+6 : off+8]),
			BytesInRes: binary.LittleEndian.Uint32(group[off+8 : off+12]),
			ID:         binary.LittleEndian.Uint16(group[off+12 : off+14]),
		}
		img, err := loadResourceBytes(mod, uintptr(entries[i].ID), rtIcon)
		if err != nil {
			return nil, err
		}
		images[i] = img
	}

	// ICONDIR + ICONDIRENTRY(16)*count + image blobs
	outSize := 6 + count*16
	for _, img := range images {
		outSize += len(img)
	}
	out := make([]byte, outSize)
	binary.LittleEndian.PutUint16(out[0:2], 0)
	binary.LittleEndian.PutUint16(out[2:4], 1)
	binary.LittleEndian.PutUint16(out[4:6], uint16(count))

	cursor := 6 + count*16
	for i := 0; i < count; i++ {
		e := entries[i]
		off := 6 + i*16
		out[off] = e.Width
		out[off+1] = e.Height
		out[off+2] = e.ColorCount
		out[off+3] = e.Reserved
		binary.LittleEndian.PutUint16(out[off+4:off+6], e.Planes)
		binary.LittleEndian.PutUint16(out[off+6:off+8], e.BitCount)
		binary.LittleEndian.PutUint32(out[off+8:off+12], uint32(len(images[i])))
		binary.LittleEndian.PutUint32(out[off+12:off+16], uint32(cursor))
		copy(out[cursor:], images[i])
		cursor += len(images[i])
	}
	return out, nil
}

func firstResourceName(mod windows.Handle, resType uintptr) (uintptr, bool) {
	var found uintptr
	var ok bool
	cb := windows.NewCallback(func(hModule, lpszType, lpszName, lParam uintptr) uintptr {
		found = lpszName
		ok = true
		return 0 // stop enumeration
	})
	procEnumResourceNamesW.Call(uintptr(mod), resType, cb, 0)
	return found, ok
}

func loadResourceBytes(mod windows.Handle, name uintptr, resType uintptr) ([]byte, error) {
	hRes, _, err := procFindResourceW.Call(uintptr(mod), name, resType)
	if hRes == 0 {
		return nil, fmt.Errorf("FindResource: %v", err)
	}
	size, _, _ := procSizeofResource.Call(uintptr(mod), hRes)
	if size == 0 {
		return nil, fmt.Errorf("empty resource")
	}
	hData, _, err := procLoadResource.Call(uintptr(mod), hRes)
	if hData == 0 {
		return nil, fmt.Errorf("LoadResource: %v", err)
	}
	ptr, _, err := procLockResource.Call(hData)
	if ptr == 0 {
		return nil, fmt.Errorf("LockResource: %v", err)
	}
	buf := make([]byte, size)
	copy(buf, unsafe.Slice((*byte)(unsafe.Pointer(ptr)), int(size)))
	return buf, nil
}
