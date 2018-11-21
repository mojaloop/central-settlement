#!/usr/bin/env bash
echo
echo "*********************************************************************"
echo "---------------------------------------------------------------------"
echo "Showing current database state"
echo "---------------------------------------------------------------------"
echo

CWD="${0%/*}"

if [[ "$CWD" =~ ^(.*)\.sh$ ]];
then
    CWD="."
fi
source $CWD/env.sh

echo "TABLE settlementParticipantCurrency"
docker exec -it $DB_ID mysql -uroot -e "SELECT * FROM central_ledger.settlementParticipantCurrency ORDER BY 1 DESC"
echo "=> EXPECTED RESULT: No change. Showing same 2 records."
echo
echo

echo "TABLE settlementParticipantCurrencyStateChange"
docker exec -it $DB_ID mysql -uroot -e "SELECT * FROM central_ledger.settlementParticipantCurrencyStateChange ORDER BY 1 DESC"
echo "=> EXPECTED RESULT: Both settlement accounts are now PS_TRANSFERS_COMMITTED. Showing 8 records (previously 6)."
echo
echo

echo "TABLE settlementStateChange"
docker exec -it $DB_ID mysql -uroot -e "SELECT * FROM central_ledger.settlementStateChange ORDER BY 1 DESC"
echo "=> EXPECTED RESULT: Settlement state has changed also to PS_TRANSFERS_COMMITTED. Showing 4 records (previously 3)."
echo ""
echo
echo

echo "TABLE settlementWindowStateChange"
docker exec -it $DB_ID mysql -uroot -e "SELECT * FROM central_ledger.settlementWindowStateChange ORDER BY 1 DESC"
echo "=> EXPECTED RESULT: Settlement window is still PENDING_SETTLEMENT state. Showing same 4 records."
echo
echo

echo "TABLE transferDuplicateCheck"
docker exec -it $DB_ID mysql -uroot -e "SELECT * FROM central_ledger.transferDuplicateCheck ORDER BY createdDate DESC"
echo "=> EXPECTED RESULT: No change here. Showing same 4 records."
echo
echo

echo "TABLE transfer"
docker exec -it $DB_ID mysql -uroot -e "SELECT * FROM central_ledger.transfer ORDER BY createdDate DESC"
echo "=> EXPECTED RESULT: No change here. Showing same 4 records."
echo
echo

echo "TABLE transferFulfilment"
docker exec -it $DB_ID mysql -uroot -e "
SELECT SUBSTRING(transferId, -20) AS trasnferId_20,
SUBSTRING(transferFulfilmentId, -20) AS transferFulfilmentId_20,
ilpFulfilment, completedDate, isValid, settlementWindowId, createdDate
FROM central_ledger.transferFulfilment 
ORDER BY createdDate DESC"
echo "=> EXPECTED RESULT: Both settlement transfers are now fulfiled. Showing 4 records (previously 2)."
echo
echo

echo "TABLE transferParticipant (w/ enums)"
docker exec -it $DB_ID mysql -uroot -e "
SELECT tp.transferParticipantId AS id, tp.transferId, 
CONCAT(tp.participantCurrencyId, '-', p.name, '-', lat.name) AS participantCurrencyId,
CONCAT(tp.transferParticipantRoleTypeId, '-', tprt.name) AS transferParticipantRoleTypeId,
CONCAT(tp.ledgerEntryTypeId, '-', let.name) AS ledgerEntryTypeId, tp.amount, tp.createdDate
FROM central_ledger.transferParticipant tp
JOIN central_ledger.participantCurrency pc
ON pc.participantCurrencyId = tp.participantCurrencyId
JOIN central_ledger.ledgerAccountType lat
ON lat.ledgerAccountTypeId = pc.ledgerAccountTypeId
JOIN central_ledger.participant p
ON p.participantId = pc.participantId
JOIN central_ledger.transferParticipantRoleType tprt
ON tprt.transferParticipantRoleTypeId = tp.transferParticipantRoleTypeId
JOIN central_ledger.ledgerEntryType let
ON let.ledgerEntryTypeId = tp.ledgerEntryTypeId
ORDER BY tp.transferParticipantId DESC"
echo "=> No change here. Showing same 8 records."
echo
echo

echo "TABLE transferParticipant TOTALS by account REGARDLESS transferState (w/ enums)"
docker exec -it $DB_ID mysql -uroot -e "
SELECT CONCAT(tp.participantCurrencyId, '-', p.name, '-', lat.name) AS participantCurrencyId, SUM(tp.amount) AS SUM_amount
FROM central_ledger.transferParticipant tp
JOIN central_ledger.participantCurrency pc
ON pc.participantCurrencyId = tp.participantCurrencyId
JOIN central_ledger.ledgerAccountType lat
ON lat.ledgerAccountTypeId = pc.ledgerAccountTypeId
JOIN central_ledger.participant p
ON p.participantId = pc.participantId
GROUP BY CONCAT(tp.participantCurrencyId, '-', p.name, '-', lat.name)
ORDER BY 1 DESC"
echo "=> EXPECTED RESULT: The total SUM_amount for transferParticipant records should be always 0. Not changed."
echo
echo

echo "TABLE transferStateChange"
docker exec -it $DB_ID mysql -uroot -e "SELECT * FROM central_ledger.transferStateChange ORDER BY 1 DESC"
echo "=> EXPECTED RESULT: 2 records have been inserted - both settlement transfers are COMMITTED. Showing total 14 records (previously 12)."

echo
echo

echo "TABLE participantPosition (w/ enums)"
docker exec -it $DB_ID mysql -uroot -e "
SELECT pp.participantPositionId AS id,
CONCAT(pp.participantCurrencyId, '-', p.name, '-', lat.name) AS participantCurrencyId,
pp.value, pp.reservedValue, pp.changedDate
FROM central_ledger.participantPosition pp
JOIN central_ledger.participantCurrency pc
ON pc.participantCurrencyId = pp.participantCurrencyId
JOIN central_ledger.ledgerAccountType lat
ON lat.ledgerAccountTypeId = pc.ledgerAccountTypeId
JOIN central_ledger.participant p
ON p.participantId = pc.participantId
ORDER BY 1 DESC"
echo "=> EXPECTED RESULT: NET_SETTLEMENT_SENDER's position has been adjusted for the settlement transfer commit."
echo "The change also affected the position of the HMLNS account."
echo
echo

echo "TABLE participantPositionChange (w/ enums)"
docker exec -it $DB_ID mysql -uroot -e "
SELECT ppc.participantPositionChangeId AS id,
CONCAT(ppc.participantPositionId, '-', p.name, '-', lat.name) AS participantPositionId,
CONCAT(ppc.transferStateChangeId, '-', tsc.transferStateId, '-', tsc.transferId) transferStateChangeId,
ppc.value, ppc.reservedValue, ppc.createdDate
FROM central_ledger.participantPositionChange ppc
JOIN central_ledger.participantPosition pp
ON pp.participantPositionId = ppc.participantPositionId
JOIN central_ledger.participantCurrency pc
ON pc.participantCurrencyId = pp.participantCurrencyId
JOIN central_ledger.ledgerAccountType lat
ON lat.ledgerAccountTypeId = pc.ledgerAccountTypeId
JOIN central_ledger.participant p
ON p.participantId = pc.participantId
JOIN central_ledger.transferStateChange tsc
ON tsc.transferStateChangeId = ppc.transferStateChangeId
ORDER BY 1 DESC"
echo "=> EXPECTED RESULT: Showing history for the participantPosition bottom-up. Now showing 8 records (prevously 6)."
echo
echo

echo "TABLE participantLimit (w/ enums)"
docker exec -it $DB_ID mysql -uroot -e "
SELECT pl.participantLimitId AS id,
CONCAT(pl.participantCurrencyId, '-', p.name, '-', lat.name) AS participantCurrencyId,
CONCAT(pl.participantLimitTypeId, '-', plt.name) AS participantLimitTypeId,
pl.value, pl.thresholdAlarmPercentage, pl.startAfterParticipantPositionChangeId,
pl.isActive, pl.createdDate, pl.createdBy
FROM central_ledger.participantLimit pl
JOIN central_ledger.participantCurrency pc
ON pc.participantCurrencyId = pl.participantCurrencyId
JOIN central_ledger.ledgerAccountType lat
ON lat.ledgerAccountTypeId = pc.ledgerAccountTypeId
JOIN central_ledger.participant p
ON p.participantId = pc.participantId
JOIN central_ledger.participantLimitType plt
ON plt.participantLimitTypeId = pl.participantLimitTypeId
ORDER BY 1 DESC"
echo "=> EXPECTED RESULT: Participant limits are not affected. Showing 3 records."
echo
echo
