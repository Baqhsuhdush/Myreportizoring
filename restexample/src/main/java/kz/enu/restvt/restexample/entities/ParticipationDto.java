package kz.enu.restvt.restexample.entities;

// Data Transfer Object to handle participation mapping
public class ParticipationDto {
    private int playerId;
    private int sportClubId;

    public ParticipationDto() { }

    public ParticipationDto(int playerId, int sportClubId) {
        this.playerId = playerId;
        this.sportClubId = sportClubId;
    }

    public int getPlayerId() {
        return playerId;
    }
    public void setPlayerId(int playerId) {
        this.playerId = playerId;
    }
    public int getSportClubId() {
        return sportClubId;
    }
    public void setSportClubId(int sportClubId) {
        this.sportClubId = sportClubId;
    }
}