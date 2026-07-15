//go:build windows

package dpagent

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

// Mandatory integrity RID constants (winnt.h).
const (
	securityMandatoryMediumRID     = 0x2000
	securityMandatoryMediumPlusRID = 0x2100
	securityMandatoryHighRID       = 0x3000
)

func processIntegrityByPID(pid uint32) IntegrityLevel {
	if pid == 0 {
		return IntegrityUndetected
	}
	h, err := windows.OpenProcess(windows.PROCESS_QUERY_LIMITED_INFORMATION, false, pid)
	if err != nil {
		return IntegrityUndetected
	}
	defer windows.CloseHandle(h)
	return processIntegrity(h)
}

func processIntegrity(h windows.Handle) IntegrityLevel {
	var token windows.Token
	if err := windows.OpenProcessToken(h, windows.TOKEN_QUERY, &token); err != nil {
		return IntegrityUndetected
	}
	defer token.Close()

	// First call sizes the buffer (expects ERROR_INSUFFICIENT_BUFFER).
	var needed uint32
	err := windows.GetTokenInformation(token, windows.TokenIntegrityLevel, nil, 0, &needed)
	if err == nil || needed == 0 {
		return IntegrityUndetected
	}

	buf := make([]byte, needed)
	if err := windows.GetTokenInformation(token, windows.TokenIntegrityLevel, &buf[0], needed, &needed); err != nil {
		return IntegrityUndetected
	}

	til := (*windows.Tokenmandatorylabel)(unsafe.Pointer(&buf[0]))
	if til.Label.Sid == nil {
		return IntegrityUndetected
	}

	rid := integrityRID(til.Label.Sid)
	switch {
	case rid < securityMandatoryMediumRID:
		return IntegrityLow
	case rid < securityMandatoryMediumPlusRID:
		return IntegrityMedium
	case rid < securityMandatoryHighRID:
		return IntegrityMediumPlus
	default:
		return IntegrityHigh
	}
}

func integrityRID(sid *windows.SID) uint32 {
	count := int(sid.SubAuthorityCount())
	if count <= 0 {
		return 0
	}
	return sid.SubAuthority(uint32(count - 1))
}
